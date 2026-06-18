import { access, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  approvedDependencies,
  dependencyFields,
  expectArtifactWithinBudget,
  packageDirectories,
  publicExports,
  readManifest,
  runCommand,
  runNode,
  workspaceRoot,
} from './package-contract-helpers';
import type { PackageManifest } from './package-contract-helpers';

let fixtureDirectory: string;

beforeAll(async () => {
  fixtureDirectory = await mkdtemp(join(tmpdir(), 'cssx-package-contract-'));
  const scopeDirectory = join(fixtureDirectory, 'node_modules', '@cssxio');
  await mkdir(scopeDirectory, { recursive: true });

  for (const packageDirectory of packageDirectories) {
    const packageName = packageDirectory.split('/').at(-1);
    if (!packageName) {
      throw new Error(`Could not determine package name for ${packageDirectory}.`);
    }
    await symlink(join(workspaceRoot, packageDirectory), join(scopeDirectory, packageName), 'dir');
  }
});

afterAll(async () => {
  await rm(fixtureDirectory, { recursive: true, force: true });
});

describe('published package contract', () => {
  it.each(['esm', 'cjs'] as const)('loads every documented export through native %s resolution', async (format) => {
    const runnerPath = join(fixtureDirectory, `load-${format}.${format === 'esm' ? 'mjs' : 'cjs'}`);
    const entries = JSON.stringify(publicExports.map(({ specifier, exports }) => ({ specifier, exports })));
    const runner =
      format === 'esm'
        ? `const entries = ${entries};\nfor (const { specifier, exports } of entries) {\n  const exportedModule = await import(specifier);\n  for (const name of exports) {\n    if (!(name in exportedModule)) {\n      throw new Error(\`${'${specifier}'} is missing ${'${name}'}\`);\n    }\n  }\n}\n`
        : `const entries = ${entries};\nfor (const { specifier, exports } of entries) {\n  const exportedModule = require(specifier);\n  for (const name of exports) {\n    if (!(name in exportedModule)) {\n      throw new Error(\`${'${specifier}'} is missing ${'${name}'}\`);\n    }\n  }\n}\n`;

    await writeFile(runnerPath, runner);

    const result = await runNode(runnerPath);
    expect(result.stderr).toBe('');
  });

  it('ships every ESM, CommonJS, and declaration target declared by the public manifests', async () => {
    for (const packageDirectory of packageDirectories) {
      const manifest = await readManifest(packageDirectory);
      const documentedPaths = publicExports
        .filter((entry) => entry.packageDirectory === packageDirectory)
        .map((entry) => entry.exportPath);

      expect(Object.keys(manifest.exports).sort()).toEqual(documentedPaths.sort());
      for (const target of Object.values(manifest.exports)) {
        expect(typeof target.types).toBe('string');
        expect(typeof target.import).toBe('string');
        expect(typeof target.require).toBe('string');
        await Promise.all(
          [target.types, target.import, target.require].map((path) =>
            access(join(workspaceRoot, packageDirectory, path)),
          ),
        );
      }
    }
  });

  it('type-checks keyed styles and props through the published CSSX declaration', async () => {
    const sourcePath = join(fixtureDirectory, 'cssx-types.mts');
    await writeFile(
      sourcePath,
      `import * as cssx from '@cssxio/cssx';

const styles = cssx.create({ page: 'flex p-6', title: 'text-lg' });
const page: cssx.CompiledStyle = styles.page;
const props: { readonly className: string } = cssx.props(styles.page, styles.title);

void page;
void props;
`,
    );

    await runCommand(
      process.execPath,
      [
        join(workspaceRoot, 'node_modules', 'typescript', 'bin', 'tsc'),
        '--noEmit',
        '--strict',
        '--skipLibCheck',
        '--target',
        'ES2022',
        '--module',
        'NodeNext',
        '--moduleResolution',
        'NodeNext',
        sourcePath,
      ],
      fixtureDirectory,
    );
  });

  it('declares only approved dependencies in CSSX package manifests', async () => {
    for (const packageDirectory of packageDirectories) {
      const manifest = await readManifest(packageDirectory);
      for (const field of dependencyFields) {
        const dependencies = manifest[field] ?? {};
        for (const dependency of Object.keys(dependencies)) {
          expect(approvedDependencies.has(dependency), `${packageDirectory} ${field} includes ${dependency}`).toBe(
            true,
          );
        }
      }
    }
  });

  it('ships clean packed tarballs with licenses, built exports, and rewritten workspace versions', async () => {
    const packDirectory = await mkdtemp(join(tmpdir(), 'cssx-packed-artifacts-'));
    const installDirectory = await mkdtemp(join(tmpdir(), 'cssx-packed-install-'));
    try {
      for (const packageDirectory of packageDirectories) {
        await runCommand('pnpm', ['pack', '--pack-destination', packDirectory], join(workspaceRoot, packageDirectory));
      }

      const tarballs = (await import('node:fs/promises')).readdir(packDirectory);
      for (const tarball of await tarballs) {
        const tarballPath = join(packDirectory, tarball);
        const listing = (await runCommand('tar', ['-tzf', tarballPath])).stdout.split('\n').filter(Boolean).sort();
        const manifest = JSON.parse(
          (await runCommand('tar', ['-xOzf', tarballPath, 'package/package.json'])).stdout,
        ) as PackageManifest;

        expect(listing).toContain('package/LICENSE');
        expect(listing).toContain('package/README.md');
        expect(listing).toContain('package/dist/index.js');
        expect(listing).toContain('package/dist/index.cjs');
        expect(listing).toContain('package/dist/index.d.ts');
        expect(listing.some((path) => path.startsWith('package/src/'))).toBe(false);
        expect(JSON.stringify(manifest)).not.toContain('workspace:');
        if (manifest.name === '@cssxio/compiler') {
          expect(listing).toContain('package/THIRD_PARTY_NOTICES.md');
        }
      }

      const cssxTarball = (await (await import('node:fs/promises')).readdir(packDirectory)).find((file) =>
        file.startsWith('cssxio-cssx-'),
      );
      const compilerTarball = (await (await import('node:fs/promises')).readdir(packDirectory)).find((file) =>
        file.startsWith('cssxio-compiler-'),
      );
      if (!cssxTarball || !compilerTarball) {
        throw new Error('Expected CSSX runtime and compiler tarballs.');
      }
      await writeFile(
        join(installDirectory, 'package.json'),
        JSON.stringify({
          name: 'cssx-packed-consumer-fixture',
          private: true,
          dependencies: {
            '@cssxio/cssx': `file:${join(packDirectory, cssxTarball)}`,
            '@cssxio/compiler': `file:${join(packDirectory, compilerTarball)}`,
          },
        }),
      );
      await runCommand('pnpm', ['install', '--offline', '--ignore-scripts', '--dir', installDirectory]);
      await runCommand(
        process.execPath,
        [
          '--input-type=module',
          '--eval',
          'const compiler = await import("@cssxio/compiler"); const runtime = await import("@cssxio/cssx");\nif (typeof compiler.compileUtilities !== "function" || typeof runtime.props !== "function") {\n  process.exit(1);\n}',
        ],
        installDirectory,
      );
    } finally {
      await Promise.all([
        rm(packDirectory, { recursive: true, force: true }),
        rm(installDirectory, { recursive: true, force: true }),
      ]);
    }
  });

  it('cleans stale build output before packaging every publishable package', async () => {
    const staleFiles: string[] = [];
    try {
      for (const packageDirectory of packageDirectories) {
        const manifest = await readManifest(packageDirectory);
        const staleFile = join(workspaceRoot, packageDirectory, 'dist', '__cssx_stale_contract__.js');
        await writeFile(staleFile, 'stale build output');
        staleFiles.push(staleFile);
        await runCommand('pnpm', ['--filter', manifest.name, 'run', 'build'], workspaceRoot);
        await expect(access(staleFile)).rejects.toThrow();
      }
    } finally {
      await Promise.all(staleFiles.map((path) => rm(path, { force: true })));
    }
  }, 20_000);

