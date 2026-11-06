import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { isMigrationFile, migrationName, pendingMigrations } from "./migration-plan.mjs";
import { projectRoot } from "./with-app-env.mjs";

test("_migrations keys on basename", () => {
  assert.equal(migrationName("/migrations/0002_todos.sql"), "0002_todos.sql");
  assert.equal(migrationName("schema.sql"), "schema.sql");
});

test("pending migrations put the schema baseline before incremental files", () => {
  assert.deepEqual(
    pendingMigrations(
      ["/migrations/0017_future.sql", "/migrations/schema.sql", "/migrations/0016_old.sql"],
      [],
    ),
    [
      { name: "schema.sql", path: "/migrations/schema.sql" },
      { name: "0016_old.sql", path: "/migrations/0016_old.sql" },
      { name: "0017_future.sql", path: "/migrations/0017_future.sql" },
    ],
  );
});

test("pending incremental migrations are returned in name order", () => {
  assert.deepEqual(
    pendingMigrations(
      ["/migrations/0003_c.sql", "/migrations/0001_a.sql", "/migrations/0002_b.sql"],
      ["0001_a.sql"],
    ),
    [
      { name: "0002_b.sql", path: "/migrations/0002_b.sql" },
      { name: "0003_c.sql", path: "/migrations/0003_c.sql" },
    ],
  );
});

test("non-SQL entries are dropped", () => {
  assert.equal(isMigrationFile("auth"), false);
  assert.deepEqual(pendingMigrations(["auth", "README.md"], []), []);
});

test("the appliers discover the canonical baseline and future root migrations", () => {
  const migrationsDir = join(projectRoot(), "migrations");
  const entries = readdirSync(migrationsDir);
  const rootSqlFiles = entries.filter(isMigrationFile);
  assert.ok(rootSqlFiles.includes("schema.sql"));
  assert.deepEqual(
    pendingMigrations(entries, []).map(({ name }) => name),
    pendingMigrations(rootSqlFiles, []).map(({ name }) => name),
  );
});
