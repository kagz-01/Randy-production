import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const catalogDir = path.join(root, "public", "catalog");
const outputFile = path.join(root, "src", "data", "catalog-image-paths.ts");

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    return entry.isFile() && /\.webp$/i.test(entry.name) ? [fullPath] : [];
  });
}

const paths = walk(catalogDir)
  .map((file) => `/${path.relative(path.join(root, "public"), file).split(path.sep).join("/")}`)
  .sort((a, b) => a.localeCompare(b));

if (paths.length === 0) {
  throw new Error(`No WebP images found in ${catalogDir}`);
}

const source = `export const CATALOG_IMAGE_PATHS = [\n${paths.map((item) => `  ${JSON.stringify(item)},`).join("\n")}\n] as const;\n`;
fs.writeFileSync(outputFile, source);
console.log(`Wrote ${paths.length} catalog image paths to ${path.relative(root, outputFile)}.`);
