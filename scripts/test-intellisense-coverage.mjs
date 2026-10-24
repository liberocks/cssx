import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const vitest = path.join(root, 'node_modules/vitest/vitest.mjs');
const modules = [
  ['catalog-documentation', 'catalog-documentation'],
  ['catalog-entries', 'catalog-entries'],
  ['color-utils', 'color-utils'],
  ['create-completion-item', 'create-completion-item'],
  ['is-cssx-string', 'is-cssx-string'],
  ['provide-color', 'provide-color'],
  ['provide-completion-items', 'provide-completion-items'],
];

for (const [moduleName, testName] of modules) {
  const source = `packages/intellisense/src/${moduleName}.js`;
  const test = `packages/intellisense/src/${testName}.test.ts`;
  const result = spawnSync(process.execPath, [vitest, 'run', '--coverage', `--coverage.include=${source}`, test], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, CSSX_INTELLISENSE_COVERAGE: '1' },
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
