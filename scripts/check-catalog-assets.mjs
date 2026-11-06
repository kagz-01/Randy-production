import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const catalogFile = path.join(root, 'src', 'data', 'catalog-image-paths.ts');
const publicDir = path.join(root, 'public');

const source = fs.readFileSync(catalogFile, 'utf8');
const matches = [...source.matchAll(/"\/catalog\/[^"]+\.webp"/g)].map((m) => m[0].slice(1, -1));
const uniqueRefs = [...new Set(matches)];

if (uniqueRefs.length === 0) {
  console.error('Catalog image manifest is empty. Run `node scripts/sync-catalog-assets.mjs`.');
  process.exit(1);
}

const missing = uniqueRefs.filter((ref) => {
  const target = path.join(publicDir, ref.replace(/^\//, ''));
  return !fs.existsSync(target);
});

function findWebpFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return findWebpFiles(fullPath);
    return entry.isFile() && /\.webp$/i.test(entry.name) ? [fullPath] : [];
  });
}

const manifestSet = new Set(uniqueRefs);
const unlisted = findWebpFiles(path.join(publicDir, 'catalog'))
  .map((file) => `/${path.relative(publicDir, file).split(path.sep).join('/')}`)
  .filter((ref) => !manifestSet.has(ref));

if (missing.length > 0) {
  console.error('Missing catalog assets:');
  for (const ref of missing) {
    console.error(` - ${ref}`);
  }
}

if (unlisted.length > 0) {
  console.error('Catalog WebP files missing from the image manifest. Run `node scripts/sync-catalog-assets.mjs`:');
  for (const ref of unlisted) {
    console.error(` - ${ref}`);
  }
}

if (missing.length > 0 || unlisted.length > 0) process.exit(1);
console.log(`Catalog asset check passed (${uniqueRefs.length} WebP files are indexed).`);
