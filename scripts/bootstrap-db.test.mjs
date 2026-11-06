import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { test } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = join(root, "migrations");

test("schema.sql bootstraps cleanly before the ordered migrations", async () => {
  const db = new PGlite();
  await db.waitReady;
  try {
    const schema = await readFile(join(migrationsDir, "schema.sql"), "utf8");
    await db.exec(schema);
    await db.exec(
      "create table _migrations (name text primary key, applied_at timestamptz not null default now())",
    );

    const names = (await readdir(migrationsDir))
      .filter((name) => name.endsWith(".sql"))
      .sort((left, right) => left.localeCompare(right));
    for (const name of names) {
      const migration = await readFile(join(migrationsDir, name), "utf8");
      try {
        await db.transaction(async (tx) => {
          await tx.exec(migration);
          await tx.query("insert into _migrations (name) values ($1)", [name]);
        });
      } catch (error) {
        throw new Error(`Failed applying ${name} after schema.sql: ${error.message}`, {
          cause: error,
        });
      }
    }

    const tables = await db.query(
      `select table_name from information_schema.tables
       where table_schema = 'public' and table_type = 'BASE TABLE'`,
    );
    const tableNames = new Set(tables.rows.map((row) => row.table_name));
    for (const name of [
      "user",
      "session",
      "account",
      "verification",
      "profiles",
      "jobs",
      "quotes",
      "invoices",
      "receipts",
      "offline_payment_reports",
      "payment_agreements",
      "payment_milestones",
      "team_invites",
      "studio_channels",
      "studio_messages",
      "studio_attachments",
      "studio_message_reactions",
      "studio_presence",
      "knowledge_entries",
      "knowledge_ai_usage",
    ]) {
      assert.ok(tableNames.has(name), `missing table ${name}`);
    }

    const columns = await db.query(
      `select column_name from information_schema.columns
       where table_schema = 'public' and table_name = 'quotes'`,
    );
    assert.ok(columns.rows.some((row) => row.column_name === "venue_type"));
    const applied = await db.query("select count(*)::int as count from _migrations");
    assert.equal(applied.rows[0].count, names.length);
  } finally {
    await db.close();
  }
});
