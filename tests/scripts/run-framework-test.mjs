import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const [framework, mode] = process.argv.slice(2);
if (!framework || !['development', 'production'].includes(mode)) {
  throw new Error('Usage: node tests/scripts/run-framework-test.mjs <framework> <development|production>');
}

const root = resolve(import.meta.dirname, '../..');
const command = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const child = spawn(
  command,
  ['--dir', 'tests', 'exec', 'playwright', 'test', framework, '--config', 'playwright.config.ts'],
  {
    cwd: root,
    env: {
      ...process.env,
      CSSX_VISUAL_FRAMEWORK: framework,
      CSSX_VISUAL_MODE: mode,
    },
    shell: process.platform === 'win32',
    stdio: 'inherit',
  },
);
child.once('error', (error) => {
  throw error;
});
child.once('exit', (code) => process.exit(code ?? 1));
