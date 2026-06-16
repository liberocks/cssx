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

