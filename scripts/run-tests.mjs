import { spawnSync } from "node:child_process";
import { globSync } from "node:fs";

const mjsTests = globSync("scripts/**/*.test.mjs");
const tsTests = globSync("src/lib/**/*.test.ts");

let failed = false;

if (mjsTests.length > 0) {
  console.log(`Running ${mjsTests.length} .mjs tests...`);
  const r = spawnSync(
    "node",
    ["--test", ...mjsTests],
    { stdio: "inherit" }
  );
  if (r.status !== 0) failed = true;
}

if (tsTests.length > 0) {
  console.log(`Running ${tsTests.length} .ts tests...`);
  const r = spawnSync(
    "node",
    ["--experimental-strip-types", "--test", ...tsTests],
    { stdio: "inherit" }
  );
  if (r.status !== 0) failed = true;
}

process.exit(failed ? 1 : 0);
