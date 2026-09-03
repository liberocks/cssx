import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { compileStyleRecords } from '../packages/compiler/dist/index.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tailwindMajorVersion = 4;
const tailwindRoot = path.join(root, 'experiments', 'tailwindcss');
const snapshotPath = path.join(
  tailwindRoot,
  'packages',
  'tailwindcss',
  'src',
  '__snapshots__',
  'intellisense.test.ts.snap',
);
const packagePath = path.join(tailwindRoot, 'packages', 'tailwindcss', 'package.json');
const outputPath = path.join(root, 'packages', 'compiler', 'test', 'fixtures', `tailwind-${tailwindMajorVersion}.json`);

let snapshot;
let tailwindPackage;
try {
  [snapshot, tailwindPackage] = await Promise.all([
    readFile(snapshotPath, 'utf8'),
    readFile(packagePath, 'utf8').then(JSON.parse),
  ]);
} catch {
  throw new Error(
    `Clone a Tailwind ${tailwindMajorVersion}.x release first: git clone --depth 1 https://github.com/tailwindlabs/tailwindcss.git experiments/tailwindcss`,
  );
}

if (!new RegExp(`^${tailwindMajorVersion}\\.`).test(tailwindPackage.version)) {
  throw new Error(`Expected Tailwind ${tailwindMajorVersion}.x, found ${tailwindPackage.version}.`);
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
    major: tailwindMajorVersion,
    version: tailwindPackage.version,
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
