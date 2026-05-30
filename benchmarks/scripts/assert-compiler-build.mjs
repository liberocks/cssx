import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';

const packageDirectory = resolve(import.meta.dirname, '../../packages/compiler');
const sourceFiles = await filesIn(join(packageDirectory, 'src'));
const manifest = JSON.parse(await readFile(join(packageDirectory, 'dist/BUILD_MANIFEST.json'), 'utf8'));
const sourceHash = await hashFiles(packageDirectory, sourceFiles);

if (manifest.format !== 1 || manifest.sourceHash !== sourceHash) {
  throw new Error('CSSX benchmark requires a compiler dist build that matches packages/compiler/src.');
}
for (const [artifact, expectedHash] of Object.entries(manifest.artifacts ?? {})) {
  const actualHash = createHash('sha256')
    .update(await readFile(join(packageDirectory, artifact)))
    .digest('hex');
  if (actualHash !== expectedHash) {
    throw new Error(`CSSX benchmark requires an unmodified compiler artifact: ${artifact}.`);
  }
}

async function filesIn(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) =>
