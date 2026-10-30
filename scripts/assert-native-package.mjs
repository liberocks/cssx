import { access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../packages/compiler-native');
await access(resolve(packageDirectory, 'libcssx_compiler_node.dylib'));
