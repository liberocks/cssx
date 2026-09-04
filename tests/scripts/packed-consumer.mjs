import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
const manager = process.argv[2];
if (!['bun', 'npm', 'pnpm', 'yarn'].includes(manager)) {
  throw new Error('Usage: node tests/scripts/packed-consumer.mjs <bun|npm|pnpm|yarn>');
}

const root = resolve(import.meta.dirname, '../..');
const packageCommand = (name) => (process.platform === 'win32' && name !== 'bun' ? `${name}.cmd` : name);
const command = packageCommand(manager);
const packageDirectories = [
  'packages/compiler',
  'packages/cssx',
  'packages/babel-plugin',
  'packages/html',
  'packages/react-native',
  'packages/unplugin',
];
const temporary = await mkdtemp(join(tmpdir(), 'cssx-packed-consumer-'));
const tarballs = join(temporary, 'tarballs');
const consumer = join(temporary, 'consumer');

async function run(executable, args, cwd) {
  await new Promise((resolveRun, reject) => {
    const child = spawn(executable, args, {
      cwd,
      // npm, pnpm, and Yarn are batch files on Windows, while bun.exe and
      // node.exe must be launched directly. Running every command through a
      // shell also corrupts the multiline ESM assertion below.
      shell: process.platform === 'win32' && executable.endsWith('.cmd'),
      stdio: 'inherit',
      windowsHide: true,
    });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) {
        resolveRun();
        return;
      }
      reject(new Error(`${executable} ${args.join(' ')} failed with ${signal ?? `code ${code ?? 'unknown'}`}.`));
    });
  });
}

try {
  await mkdir(tarballs);
  await mkdir(consumer);
  for (const packageDirectory of packageDirectories) {
    await run(packageCommand('pnpm'), ['pack', '--pack-destination', tarballs], join(root, packageDirectory));
  }
  const dependencies = {};
  for (const tarball of await readdir(tarballs)) {
    const packageDirectory = packageDirectories.find((directory) => {
      const name = directory.split('/').at(-1);
      return name && tarball.startsWith(`cssxio-${name}-`);
    });
    if (!packageDirectory) continue;
    const manifest = JSON.parse(
      await (await import('node:fs/promises')).readFile(join(root, packageDirectory, 'package.json'), 'utf8'),
    );
    dependencies[manifest.name] = `file:${join(tarballs, tarball)}`;
  }
  await writeFile(
    join(consumer, 'package.json'),
    `${JSON.stringify({ name: 'cssx-packed-consumer', private: true, type: 'module', dependencies }, null, 2)}\n`,
  );
  if (manager === 'yarn') {
    await writeFile(join(consumer, '.yarnrc.yml'), 'nodeLinker: node-modules\n');
  }
  await run(command, ['install', '--ignore-scripts'], consumer);
  await run(
    process.execPath,
    [
      '--input-type=module',
      '--eval',
      `import { sx } from '@cssxio/cssx';
import { compileStyleMap } from '@cssxio/compiler';
import { transformCssxModule } from '@cssxio/unplugin';
if (!sx('p-4') || (await compileStyleMap({ card: 'p-4' })).rules.length === 0) process.exit(1);
const transformed = await transformCssxModule("import { sx } from '@cssxio/cssx'; sx('p-4')", 'entry.ts');
if (!transformed?.code) process.exit(1);`,
    ],
    consumer,
  );
  console.log(`Packed CSSX consumer installed successfully with ${manager}.`);
} finally {
  await rm(temporary, { recursive: true, force: true });
}
