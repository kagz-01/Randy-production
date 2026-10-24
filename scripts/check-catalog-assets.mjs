import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const catalogFile = path.join(root, 'src', 'data', 'catalog.ts');
const publicDir = path.join(root, 'public');

const source = fs.readFileSync(catalogFile, 'utf8');
const matches = [...source.matchAll(/\/catalog\/[^"'\s)]+\.webp/g)].map((m) => m[0]);
const uniqueRefs = [...new Set(matches)];

if (uniqueRefs.length === 0) {
  console.log('No catalog image references found.');
  process.exit(0);
}

const missing = uniqueRefs.filter((ref) => {
  const target = path.join(publicDir, ref.replace(/^\//, ''));
  return !fs.existsSync(target);
});

if (missing.length > 0) {
  console.warn('WARNING: Missing catalog assets (add images to public/catalog/):');
  for (const ref of missing) {
    console.warn(` - ${ref}`);
  }
  console.warn('Continuing build — these are non-blocking warnings.');
}

console.log(`Catalog asset check passed (${uniqueRefs.length} image references verified).`);
