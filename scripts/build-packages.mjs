import { spawn } from 'node:child_process';

const command = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const packages = [
  '@cssxio/compiler',
  '@cssxio/cssx',
  '@cssxio/babel-plugin',
  '@cssxio/html',
  '@cssxio/react-native',
  '@cssxio/unplugin',
];

for (const packageName of packages) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, ['--filter', packageName, 'run', 'build'], {
      shell: process.platform === 'win32',
      stdio: 'inherit',
    });
    child.once('error', reject);
    child.once('exit', (code) => (code === 0 ? resolve() : reject(new Error(`Failed to build ${packageName}.`))));
  });
}
