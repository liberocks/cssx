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

  it('type-checks React Native styles through the published declaration', async () => {
    const sourcePath = join(fixtureDirectory, 'cssx-native-types.mts');
    await writeFile(
      sourcePath,
      `import * as cssx from '@cssxio/react-native';

const styles = cssx.create({ page: 'flex-1 p-6', title: 'text-lg' });
const page: cssx.CompiledNativeStyle = styles.page;
const props: { readonly style: cssx.NativeStyle } = cssx.props(styles.page, styles.title);

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
        if (manifest.name === '@cssxio/html') {
          expect(listing).toContain('package/dist/cssx.global.js');
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
  }, 45_000);

  it('records reproducible compiler source and artifact checksums in the published build', async () => {
    const manifest = JSON.parse(
      await readFile(join(workspaceRoot, 'packages/compiler/dist/BUILD_MANIFEST.json'), 'utf8'),
    ) as {
      readonly format: number;
      readonly sourceHash: string;
      readonly artifacts: Readonly<Record<string, string>>;
    };
    expect(manifest.format).toBe(1);
    expect(manifest.sourceHash).toMatch(/^[a-f0-9]{64}$/);
    expect(Object.keys(manifest.artifacts)).toEqual(
      expect.arrayContaining(['dist/index.js', 'dist/index.cjs', 'dist/index.d.ts']),
    );
    for (const [artifact, expectedHash] of Object.entries(manifest.artifacts)) {
      const actualHash = createHash('sha256')
        .update(await readFile(join(workspaceRoot, 'packages/compiler', artifact)))
        .digest('hex');
      expect(actualHash).toBe(expectedHash);
    }
  });

  it('keeps published CSSX package graphs within the approved dependency set', async () => {
    for (const packageDirectory of packageDirectories) {
      const manifest = await readManifest(packageDirectory);
      const dependencies = {
        ...(manifest.dependencies ?? {}),
        ...(manifest.optionalDependencies ?? {}),
        ...(manifest.peerDependencies ?? {}),
      };
      expect(Object.keys(dependencies).every((dependency) => approvedDependencies.has(dependency))).toBe(true);
    }
  });

  it('pins all GitHub Actions workflow dependencies to immutable commit revisions', async () => {
    for (const workflow of ['.github/workflows/ci.yml', '.github/workflows/npm-release.yml']) {
      const content = await readFile(join(workspaceRoot, workflow), 'utf8');
      const actions = [...content.matchAll(/^\s*- uses:\s+[^@\s]+@([^\s#]+)/gm)].map((match) => match[1]);
      expect(actions.length, `${workflow} has no actions`).toBeGreaterThan(0);
      expect(actions.every((revision) => /^[a-f0-9]{40}$/i.test(revision ?? ''))).toBe(true);
    }
  });

  it('requires npm releases to identify one package explicitly', async () => {
    const workflow = await readFile(join(workspaceRoot, '.github/workflows/npm-release.yml'), 'utf8');
    expect(workflow).toContain('name: npm-release');
    expect(workflow).toContain('package:');
    expect(workflow).toContain('--package "$PACKAGE"');
    expect(workflow).toContain('--retry-existing-version "$RETRY_EXISTING_VERSION"');
    expect(workflow).toContain('retry_existing_version:');
    expect(workflow).toContain('dry_run:');
    expect(workflow).toContain('A dry run must simulate a new version');
    expect(workflow).toContain('requires-version-bump');
    expect(workflow).toContain('node-version: 24');
    expect(workflow).toContain('retry will create its missing tag and GitHub Release');
    expect(workflow).toContain('Skipping already-published');
    expect(workflow).toContain('merge_release_pr()');
    expect(workflow).toContain('Simulate package publication');
    expect(workflow).toContain('No release branch, pull request, npm package, tag, or GitHub Release was created.');
    expect(workflow).toContain('persist-credentials: false');
    expect(workflow).not.toContain('wait_for_ci');
    expect(workflow).not.toContain('--auto');
    expect(workflow).toContain('queue: max');
  });

  it('keeps the built runtime and a fixed generated-CSS fixture within budget', async () => {
    await expectArtifactWithinBudget('packages/cssx/dist/index.js', { raw: 1_800, gzip: 750, brotli: 650 });
    await expectArtifactWithinBudget('packages/cssx/dist/index.cjs', { raw: 3_000, gzip: 1_200, brotli: 1_000 });

    const runnerPath = join(fixtureDirectory, 'compile-fixture.mjs');
    await writeFile(
      runnerPath,
      `import { compileStyleMap, serializeCss } from '@cssxio/compiler';\nconst result = await compileStyleMap({ button: 'inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700', disabled: 'opacity-50' });\nprocess.stdout.write(JSON.stringify({ css: serializeCss(result.rules), ruleCount: result.rules.length }));\n`,
    );

    const result = await runNode(runnerPath);
    const output = JSON.parse(result.stdout) as { css: string; ruleCount: number };
    const css = Buffer.from(output.css);

    expect(output.ruleCount).toBe(1);
    expect(css.byteLength).toBeLessThanOrEqual(2_000);
    expect(gzipSync(css).byteLength).toBeLessThanOrEqual(750);
    expect(
      brotliCompressSync(css, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).byteLength,
    ).toBeLessThanOrEqual(650);
  });

  it('keeps the Astro example composite-class output below the previous shipped-size baseline', async () => {
    await runCommand('pnpm', ['--dir', 'examples/astro', 'build'], workspaceRoot);
    const html = await readFile(join(workspaceRoot, 'examples/astro/dist/index.html'));
    const css = await readFile(join(workspaceRoot, 'examples/astro/dist/assets/cssx.css'));
    const htmlText = html.toString('utf8');
    const cssxClassValues = [...htmlText.matchAll(/class="(s[0-9A-Za-z]+x)"/g)].map((match) => match[1] ?? '');

    expect(cssxClassValues.length).toBeGreaterThan(0);
    expect(cssxClassValues.every((className) => !className.includes(' '))).toBe(true);
    expect(htmlText).not.toContain('class="rounded-md');
    expect(gzipSync(html).byteLength + gzipSync(css).byteLength).toBeLessThan(1_955);
  }, 15_000);

  it('keeps compiler, transform, and adapter artifacts within their release budgets', async () => {
    const adapterChunk = (await readdir(join(workspaceRoot, 'packages/unplugin/dist'))).find((file) =>
      /^chunk-[A-Z0-9]+\.js$/.test(file),
    );
    if (!adapterChunk) {
      throw new Error('Expected the unplugin shared adapter chunk.');
    }
    await expectArtifactWithinBudget('packages/compiler/dist/index.js', { raw: 130_000, gzip: 35_500, brotli: 29_500 });
    await expectArtifactWithinBudget('packages/compiler/dist/index.cjs', {
      raw: 131_000,
      gzip: 36_000,
      brotli: 30_000,
    });
    await expectArtifactWithinBudget('packages/babel-plugin/dist/index.js', {
      raw: 24_000,
      gzip: 5_500,
      brotli: 4_900,
    });
    await expectArtifactWithinBudget('packages/babel-plugin/dist/index.cjs', {
      raw: 25_000,
      gzip: 5_800,
      brotli: 5_200,
    });
    await expectArtifactWithinBudget(`packages/unplugin/dist/${adapterChunk}`, {
      raw: 18_250,
      gzip: 6_900,
      brotli: 6_200,
    });
    await expectArtifactWithinBudget('packages/unplugin/dist/index.cjs', { raw: 19_250, gzip: 7_200, brotli: 6_500 });
  });

  it('cold-imports compiler, transform, and adapter packages within the release ceiling', async () => {
    const runnerPath = join(fixtureDirectory, 'cold-import.mjs');
    await writeFile(
      runnerPath,
      `const started = performance.now();\nawait Promise.all([import('@cssxio/compiler'), import('@cssxio/babel-plugin'), import('@cssxio/unplugin')]);\nprocess.stdout.write(String(performance.now() - started));\n`,
    );
    const result = await runNode(runnerPath);
    const elapsed = Number(result.stdout);

    expect(Number.isFinite(elapsed)).toBe(true);
    expect(elapsed).toBeLessThan(2_000);
  });

  it('builds the Astro documentation with its CSSX stylesheet', async () => {
    const html = await readFile(join(workspaceRoot, 'packages/docs/dist/index.html'), 'utf8');
    const css = await readFile(join(workspaceRoot, 'packages/docs/dist/assets/cssx.css'), 'utf8');
    const docs = await readFile(join(workspaceRoot, 'packages/docs/dist/docs/index.html'), 'utf8');

    expect(html).toContain('href="/assets/cssx.css"');
    expect(html).toContain('Dolor sit amet consectetur.');
    expect(docs).toContain('Configuration');
    expect(css).toContain('background-color:');
    expect(css).toContain('border-style:solid');
    expect(css).toContain('padding:');
  });
});
