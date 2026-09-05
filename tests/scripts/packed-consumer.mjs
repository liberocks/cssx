import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
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
const patchedTarballs = join(temporary, 'patched-tarballs');
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
  await mkdir(patchedTarballs);
  await mkdir(consumer);
  for (const packageDirectory of packageDirectories) {
    await run(packageCommand('pnpm'), ['pack', '--pack-destination', tarballs], join(root, packageDirectory));
  }

  const packages = [];
  const tarballByPackage = new Map();
  for (const tarball of await readdir(tarballs)) {
    const packageDirectory = packageDirectories.find((directory) => {
      const name = directory.split('/').at(-1);
      return name && tarball.startsWith(`cssxio-${name}-`);
    });
    if (!packageDirectory) continue;
    const manifest = JSON.parse(await readFile(join(root, packageDirectory, 'package.json'), 'utf8'));
    const source = join(tarballs, tarball);
    const destination = join(patchedTarballs, tarball);
    packages.push({ manifest, source, destination, temporaryDirectory: join(temporary, tarball) });
    tarballByPackage.set(manifest.name, destination);
  }

  for (const packageInfo of packages) {
    await mkdir(packageInfo.temporaryDirectory);
    await run(
      process.platform === 'win32' ? 'tar.exe' : 'tar',
      ['-xzf', packageInfo.source, '-C', packageInfo.temporaryDirectory],
      root,
    );
    const manifestPath = join(packageInfo.temporaryDirectory, 'package', 'package.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    for (const [name, tarball] of tarballByPackage) {
      if (manifest.dependencies?.[name]) manifest.dependencies[name] = `file:${tarball}`;
    }
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    await run(
      process.platform === 'win32' ? 'tar.exe' : 'tar',
      ['-czf', packageInfo.destination, '-C', packageInfo.temporaryDirectory, 'package'],
      root,
    );
  }

  const dependencies = {};
  for (const packageInfo of packages) {
    dependencies[packageInfo.manifest.name] =
      `file:${['bun', 'yarn'].includes(manager) ? packageInfo.source : packageInfo.destination}`;
  }
  const consumerManifest = { name: 'cssx-packed-consumer', private: true, type: 'module', dependencies };
  if (manager === 'yarn') {
    consumerManifest.resolutions = Object.fromEntries(
      packages.map((packageInfo) => [packageInfo.manifest.name, `file:${packageInfo.source}`]),
    );
  }
  if (manager === 'bun') {
    consumerManifest.overrides = Object.fromEntries(
      packages.map((packageInfo) => [packageInfo.manifest.name, `file:${packageInfo.source}`]),
    );
  }
  await writeFile(join(consumer, 'package.json'), `${JSON.stringify(consumerManifest, null, 2)}\n`);
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
