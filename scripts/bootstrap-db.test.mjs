import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { test } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = join(root, "migrations");

test("schema.sql bootstraps the complete database idempotently", async () => {
  const db = new PGlite();
  await db.waitReady;
  try {
    const schema = await readFile(join(migrationsDir, "schema.sql"), "utf8");
    await db.exec(schema);
    await db.exec(schema);

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

    for (const [table, column] of [
      ["quotes", "venue_type"],
      ["profiles", "avatar_data"],
      ["receipts", "provider_reference"],
      ["knowledge_entries", "search_vector"],
    ]) {
      const result = await db.query(
        `select 1 from information_schema.columns
         where table_schema = 'public' and table_name = $1 and column_name = $2`,
        [table, column],
      );
      assert.equal(result.rows.length, 1, `missing column ${table}.${column}`);
    }

    const channel = await db.query("select title from studio_channels where id = 'general'");
    assert.equal(channel.rows[0]?.title, "Studio floor");
    const knowledge = await db.query("select count(*)::int as count from knowledge_entries");
    assert.equal(knowledge.rows[0].count, 6);
  } finally {
    await db.close();
  }
});
