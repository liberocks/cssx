import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';
import { expect } from 'vitest';

export const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

export const publicExports = [
  { specifier: '@cssxio/cssx', packageDirectory: 'packages/cssx', exportPath: '.', exports: ['create', 'props', 'sx'] },
  {
    specifier: '@cssxio/compiler',
    packageDirectory: 'packages/compiler',
    exportPath: '.',
    exports: [
      'classifyUtility',
      'compileStyleRecords',
      'compileStyleMap',
      'compileUtilities',
      'mergeCompiledStyles',
      'parseTheme',
      'serializeCss',
    ],
  },
  {
    specifier: '@cssxio/babel-plugin',
    packageDirectory: 'packages/babel-plugin',
    exportPath: '.',
    exports: ['default'],
  },
  {
    specifier: '@cssxio/react-native',
    packageDirectory: 'packages/react-native',
    exportPath: '.',
    exports: ['create', 'props', 'sx'],
  },
  {
    specifier: '@cssxio/react-native/babel',
    packageDirectory: 'packages/react-native',
    exportPath: './babel',
    exports: ['default'],
  },
  {
    specifier: '@cssxio/unplugin',
    packageDirectory: 'packages/unplugin',
    exportPath: '.',
    exports: [
      'default',
      'esbuild',
      'rollup',
      'rspack',
      'transformCssxModule',
      'unplugin',
      'unpluginFactory',
      'vite',
      'webpack',
    ],
  },
  ...(['vite', 'rollup', 'webpack', 'rspack', 'esbuild'] as const).map((adapter) => ({
    specifier: `@cssxio/unplugin/${adapter}`,
    packageDirectory: 'packages/unplugin',
    exportPath: `./${adapter}`,
    exports: ['default'],
  })),
] as const;

export const packageDirectories = [...new Set(publicExports.map(({ packageDirectory }) => packageDirectory))];
export const approvedDependencies = new Set([
  '@babel/core',
  '@cssxio/babel-plugin',
  '@cssxio/compiler',
  'esbuild',
  'unplugin',
]);
export const dependencyFields = [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies',
] as const;

type ExportTarget = { readonly types: string; readonly import: string; readonly require: string };
export type PackageManifest = {
  readonly name: string;
  readonly exports: Readonly<Record<string, ExportTarget>>;
  readonly dependencies?: Readonly<Record<string, string>>;
  readonly devDependencies?: Readonly<Record<string, string>>;
  readonly optionalDependencies?: Readonly<Record<string, string>>;
  readonly peerDependencies?: Readonly<Record<string, string>>;
};

export async function readManifest(packageDirectory: string): Promise<PackageManifest> {
  return JSON.parse(await readFile(join(workspaceRoot, packageDirectory, 'package.json'), 'utf8')) as PackageManifest;
}

export async function runNode(path: string): Promise<{ readonly stdout: string; readonly stderr: string }> {
  return runCommand(process.execPath, [path]);
}

export async function runCommand(
  command: string,
  args: readonly string[],
  cwd?: string,
): Promise<{ readonly stdout: string; readonly stderr: string }> {
  const childProcess = await import('node:child_process');
  return new Promise((resolvePromise, reject) => {
    childProcess.execFile(command, args, { cwd, encoding: 'utf8' }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`Package contract runner failed: ${stderr || error.message}`));
      } else {
        resolvePromise({ stdout, stderr });
      }
    });
  });
}

export async function expectArtifactWithinBudget(
  path: string,
  budget: { readonly raw: number; readonly gzip: number; readonly brotli: number },
): Promise<void> {
  const artifact = await readFile(join(workspaceRoot, path));

  expect(artifact.byteLength, `${path} raw bytes`).toBeLessThanOrEqual(budget.raw);
  expect(gzipSync(artifact).byteLength, `${path} gzip bytes`).toBeLessThanOrEqual(budget.gzip);
  expect(
    brotliCompressSync(artifact, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).byteLength,
    `${path} Brotli bytes`,
  ).toBeLessThanOrEqual(budget.brotli);
}

export async function compilerArtifactHashes(): Promise<Readonly<Record<string, string>>> {
  const manifest = JSON.parse(
    await readFile(join(workspaceRoot, 'packages/compiler/dist/BUILD_MANIFEST.json'), 'utf8'),
  ) as { readonly artifacts: Readonly<Record<string, string>> };
  return Object.fromEntries(
    await Promise.all(
      Object.keys(manifest.artifacts).map(async (artifact) => [
        artifact,
        createHash('sha256')
          .update(await readFile(join(workspaceRoot, 'packages/compiler', artifact)))
          .digest('hex'),
      ]),
    ),
  );
}
