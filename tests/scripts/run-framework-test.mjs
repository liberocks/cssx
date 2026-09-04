import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const [framework, mode] = process.argv.slice(2);
if (!framework || !['development', 'production'].includes(mode)) {
  throw new Error('Usage: node tests/scripts/run-framework-test.mjs <framework> <development|production>');
}

const root = resolve(import.meta.dirname, '../..');
const child = spawn(
  process.execPath,
  [resolve(root, 'tests/node_modules/@playwright/test/cli.js'), 'test', framework, '--config', 'playwright.config.ts'],
  {
    cwd: root,
    env: {
      ...process.env,
      CSSX_VISUAL_FRAMEWORK: framework,
      CSSX_VISUAL_MODE: mode,
    },
    stdio: 'inherit',
  },
);
child.once('error', (error) => {
  throw error;
});
child.once('exit', (code) => process.exit(code ?? 1));
