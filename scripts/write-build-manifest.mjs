import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';

const packageDirectory = resolve(process.cwd());
const sourceFiles = await filesIn(join(packageDirectory, 'src'));
const artifactFiles = (await filesIn(join(packageDirectory, 'dist'))).filter(
  (file) => !file.endsWith('/BUILD_MANIFEST.json'),
);

const sourceHash = await hashFiles(packageDirectory, sourceFiles);
const artifacts = Object.fromEntries(
  await Promise.all(artifactFiles.map(async (file) => [relative(packageDirectory, file), await hashFile(file)])),
);
const manifest = { format: 1, sourceHash, artifacts };
await writeFile(join(packageDirectory, 'dist', 'BUILD_MANIFEST.json'), `${JSON.stringify(manifest, null, 2)}\n`);

async function filesIn(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) =>
      entry.isDirectory() ? filesIn(join(directory, entry.name)) : [join(directory, entry.name)],
    ),
  );
  return files.flat().sort();
