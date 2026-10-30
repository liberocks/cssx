import { access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../packages/compiler-native');
for (const binary of [
  'cssx_compiler_node.darwin-arm64.node',
  'cssx_compiler_node.linux-x64.node',
  'cssx_compiler_node.win32-x64.node',
]) {
  await access(resolve(packageDirectory, 'native', binary));
}
