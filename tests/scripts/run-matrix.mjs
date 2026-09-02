import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

import { frameworks } from '../shared/frameworks.js';

const root = resolve(import.meta.dirname, '../..');
const tests = resolve(root, 'tests');
const update = process.env.CSSX_UPDATE_SNAPSHOTS === '1';

const run = (arguments_, env = {}) => {
  const result = spawnSync('pnpm', arguments_, {
    cwd: tests,
    stdio: 'inherit',
    env: { ...process.env, ...env },
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
};

run(['--dir', '..', '--filter', '@cssxio/html', 'build']);

run([
  'exec',
  'playwright',
  'test',
  'html',
  '--config',
  'playwright.config.ts',
  ...(update ? ['--update-snapshots'] : []),
]);

run([
  'exec',
  'playwright',
  'test',
  'coverage',
  '--config',
  'playwright.config.ts',
  ...(update ? ['--update-snapshots'] : []),
]);

run(['exec', 'playwright', 'test', 'motion', '--config', 'playwright.config.ts']);

for (const framework of frameworks) {
  for (const mode of ['development', 'production']) {
    const relativeSpec = framework;
    const arguments_ = ['exec', 'playwright', 'test', relativeSpec, '--config', 'playwright.config.ts'];
    if (update) arguments_.push('--update-snapshots');
    run(arguments_, { CSSX_VISUAL_FRAMEWORK: framework, CSSX_VISUAL_MODE: mode });
  }
}
