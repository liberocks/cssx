import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

import { frameworks } from '../shared/frameworks.js';

const root = resolve(import.meta.dirname, '../..');
const command = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

/** Installs every standalone web example before a complete visual-matrix run. */
for (const framework of frameworks) {
  await new Promise((resolveInstall, reject) => {
    const child = spawn(command, ['install', '--no-frozen-lockfile'], {
      cwd: resolve(root, 'examples', framework),
      shell: process.platform === 'win32',
      stdio: 'inherit',
    });
    child.once('error', reject);
    child.once('exit', (code) => {
      if (code === 0) {
        resolveInstall();
        return;
      }
      reject(new Error(`Installing the ${framework} example failed with code ${code ?? 'unknown'}.`));
    });
  });
}
