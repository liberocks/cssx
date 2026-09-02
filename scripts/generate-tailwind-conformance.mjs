import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { compileStyleRecords } from '../packages/compiler/dist/index.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tailwindRoot = path.join(root, 'experiments', 'tailwindcss');
const snapshotPath = path.join(
  tailwindRoot,
  'packages',
  'tailwindcss',
  'src',
  '__snapshots__',
  'intellisense.test.ts.snap',
);
const outputPath = path.join(root, 'packages', 'compiler', 'test', 'fixtures', 'tailwind-4.3.3.json');

let snapshot;
try {
  snapshot = await readFile(snapshotPath, 'utf8');
} catch {
  throw new Error(
    'Clone Tailwind first: git clone --branch v4.3.3 --depth 1 https://github.com/tailwindlabs/tailwindcss.git experiments/tailwindcss',
  );
}

const match = /exports\[`getClassList 1`\] = `\n\[\n([\s\S]*?)\n\]\n`;/.exec(snapshot);
if (!match) {
  throw new Error(`Could not locate the getClassList snapshot in ${snapshotPath}.`);
}

const candidates = match[1]
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line.startsWith('"'))
  .map((line) => JSON.parse(line.replace(/,$/, '')));

const supported = [];
const unsupported = [];
for (const candidate of candidates) {
  try {
    compileStyleRecords({ candidate });
    supported.push(candidate);
  } catch {
    unsupported.push(candidate);
  }
}

const manifest = {
  source: {
    repository: 'https://github.com/tailwindlabs/tailwindcss',
    version: '4.3.3',
    commit: execFileSync('git', ['-C', tailwindRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    snapshot: 'packages/tailwindcss/src/__snapshots__/intellisense.test.ts.snap#getClassList-1',
  },
  total: candidates.length,
  supported,
  unsupported,
};

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(
  `Wrote ${path.relative(root, outputPath)} (${supported.length} supported, ${unsupported.length} unsupported).`,
);
