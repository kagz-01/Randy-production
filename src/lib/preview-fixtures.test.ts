import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { getPreviewRole } from "./preview-fixtures.server.ts";
import { isPreviewFixturesEnabled } from "./env.server.ts";

const keys = [
  "NODE_ENV",
  "GROK_PROJECT_ID",
  "DATABASE_URL",
  "VITE_AUTH_ENABLED",
  "RANDY_PREVIEW_FIXTURES",
  "RANDY_PREVIEW_ROLE",
] as const;
const originalEnv = new Map(keys.map((key) => [key, process.env[key]]));

afterEach(() => {
  for (const key of keys) {
    const value = originalEnv.get(key);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("isolated preview fixtures", () => {
  it("only enables fixtures in an unauthenticated, local development process", () => {
    process.env.NODE_ENV = "development";
    delete process.env.GROK_PROJECT_ID;
    delete process.env.DATABASE_URL;
    process.env.VITE_AUTH_ENABLED = "false";
    process.env.RANDY_PREVIEW_FIXTURES = "1";
    assert.equal(isPreviewFixturesEnabled(), true);

    process.env.DATABASE_URL = "postgres://configured.example.invalid/db";
    assert.equal(isPreviewFixturesEnabled(), false);
    delete process.env.DATABASE_URL;

    process.env.GROK_PROJECT_ID = "deployed-project";
    assert.equal(isPreviewFixturesEnabled(), false);
    delete process.env.GROK_PROJECT_ID;

    process.env.VITE_AUTH_ENABLED = "true";
    assert.equal(isPreviewFixturesEnabled(), false);
    process.env.VITE_AUTH_ENABLED = "false";

    process.env.NODE_ENV = "production";
    assert.equal(isPreviewFixturesEnabled(), false);
  });

  it("accepts only the supported preview roles and defaults safely to admin", () => {
    assert.equal(getPreviewRole("admin"), "admin");
    assert.equal(getPreviewRole("staff"), "staff");
    assert.equal(getPreviewRole("client"), "client");
    assert.equal(getPreviewRole("unknown"), "admin");
  });
});
