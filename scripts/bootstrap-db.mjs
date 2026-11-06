#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  console.error("[bootstrap] DATABASE_URL is required.");
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const schemaPath = join(root, "migrations", "schema.sql");
const pool = new pg.Pool({ connectionString: databaseUrl, max: 1 });

async function main() {
  let client;
  try {
    client = await pool.connect();
    const existing = await client.query(
      `select c.relname
       from pg_class c
       join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = current_schema()
         and c.relkind in ('r', 'p', 'v', 'm', 'S', 'f')
       limit 1`,
    );
    if (existing.rows.length > 0) {
      throw new Error(
        `Refusing to bootstrap non-empty schema "${existing.rows[0].relname}". Use npm run db:migrate for an existing database.`,
      );
    }

    const schema = await readFile(schemaPath, "utf8");
    await client.query("BEGIN");
    try {
      await client.query(schema);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
    console.log("[bootstrap] Current schema baseline applied.");
  } finally {
    client?.release();
    await pool.end();
  }

  const migration = spawnSync(process.execPath, [join(root, "scripts", "migrate.mjs")], {
    cwd: root,
    env: process.env,
    stdio: "inherit",
  });
  if (migration.error) throw migration.error;
  if (migration.status !== 0) {
    process.exitCode = migration.status ?? 1;
    return;
  }
  console.log("[bootstrap] Database bootstrap complete.");
}

main().catch((error) => {
  console.error("[bootstrap] Failed:", error?.message || error);
  process.exitCode = 1;
});
