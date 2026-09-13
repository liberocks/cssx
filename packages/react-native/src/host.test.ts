import { execFile } from 'node:child_process';
import { access, cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { expect, it } from 'vitest';

const execFileAsync = promisify(execFile);
const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

it('installs a generated native host independently of its parent workspace', async () => {
  const fixture = await mkdtemp(join(tmpdir(), 'cssx-native-host-'));
  const host = join(fixture, 'tests/.tmp/CssxNativeHarness');
  const script = join(fixture, 'tests/scripts/prepare-react-native-host.mjs');
  const parentLockfile = "lockfileVersion: '9.0'\nimporters:\n  .: {}\n";

  async function writeFixture(path: string, contents: string) {
    const destination = join(fixture, path);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, contents);
  }

  try {
    await writeFixture('package.json', JSON.stringify({ name: 'parent-workspace', private: true }));
    await writeFixture('pnpm-workspace.yaml', 'packages:\n  - packages/*\n');
    await writeFixture('pnpm-lock.yaml', parentLockfile);
    await writeFixture(
      'packages/compiler/package.json',
      JSON.stringify({ name: '@cssxio/compiler', version: '1.0.0', main: './dist/index.cjs' }),
    );
    await writeFixture('packages/compiler/dist/index.cjs', "module.exports = 'local compiler';\n");
    await writeFixture(
      'packages/react-native/package.json',
      JSON.stringify({
        name: '@cssxio/react-native',
        version: '1.0.0',
        main: './dist/index.cjs',
        dependencies: { '@cssxio/compiler': '^1.0.0' },
      }),
    );
    await writeFixture('packages/react-native/dist/index.cjs', "module.exports = require('@cssxio/compiler');\n");
    await writeFixture('examples/react-native/src/App.tsx', 'export default function App() {}\n');
    await writeFixture('examples/react-native/babel.config.js', 'module.exports = {};\n');
    await writeFixture(
      'tests/.tmp/CssxNativeHarness/vendor/native-runtime/package.json',
      JSON.stringify({
        name: 'react-native',
        version: '1.0.0',
        dependencies: { '@react-native/gradle-plugin': 'file:../gradle-plugin' },
      }),
    );
    await writeFixture(
      'tests/.tmp/CssxNativeHarness/vendor/gradle-plugin/package.json',
      JSON.stringify({ name: '@react-native/gradle-plugin', version: '1.0.0' }),
    );
    await writeFixture(
      'tests/.tmp/CssxNativeHarness/vendor/gradle-plugin/settings.gradle.kts',
      '// Native build fixture\n',
    );
    await writeFixture(
      'tests/.tmp/CssxNativeHarness/package.json',
      JSON.stringify({
        name: 'native-host',
        private: true,
        dependencies: { 'react-native': 'file:vendor/native-runtime' },
      }),
    );
    await mkdir(dirname(script), { recursive: true });
    await cp(join(workspaceRoot, 'tests/scripts/prepare-react-native-host.mjs'), script);

    await execFileAsync(process.execPath, [script, host]);
    await execFileAsync(
      process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
      ['install', '--offline', '--ignore-scripts', '--no-frozen-lockfile'],
      {
        cwd: host,
        env: { ...process.env, CI: 'true' },
        shell: process.platform === 'win32',
      },
    );
    const { stdout } = await execFileAsync(
      process.execPath,
      ['-e', "console.log(require('@cssxio/react-native'), require('@cssxio/compiler'))"],
      { cwd: host },
    );

    expect(stdout.trim()).toBe('local compiler local compiler');
    expect(await readFile(join(host, 'node_modules/@react-native/gradle-plugin/settings.gradle.kts'), 'utf8')).toBe(
      '// Native build fixture\n',
    );
    await expect(access(join(host, 'pnpm-lock.yaml'))).resolves.toBeUndefined();
    expect(await readFile(join(fixture, 'pnpm-lock.yaml'), 'utf8')).toBe(parentLockfile);
    await expect(access(join(fixture, 'node_modules'))).rejects.toMatchObject({ code: 'ENOENT' });
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
}, 30_000);
