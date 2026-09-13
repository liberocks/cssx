import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Absolute workspace root used by package-contract checks. */
export const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

/** Public package entry points and exports that must remain available to consumers. */
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
      'compileSourceUtilities',
      'compileUtilities',
      'mergeCompiledStyles',
      'parseTheme',
      'serializeCss',
    ],
  },
  {
    specifier: '@cssxio/html',
    packageDirectory: 'packages/html',
    exportPath: '.',
    exports: ['RUNTIME_STYLESHEET_ATTRIBUTE', 'start'],
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

/** Unique package directories represented by the public export table. */
export const packageDirectories = [...new Set(publicExports.map(({ packageDirectory }) => packageDirectory))];

/** Dependencies allowed to appear in published package manifests. */
export const approvedDependencies = new Set([
  '@babel/core',
  '@cssxio/babel-plugin',
  '@cssxio/compiler',
  '@vue/compiler-sfc',
  'esbuild',
  'unplugin',
]);

/** Manifest fields inspected by package-contract checks. */
export const dependencyFields = [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies',
] as const;

/** Package export target declaration from a package manifest. */
export type ExportTarget = { readonly types: string; readonly import: string; readonly require: string };

/** Package manifest fields used by the package-contract suite. */
export type PackageManifest = {
  readonly name: string;
  readonly exports: Readonly<Record<string, ExportTarget>>;
  readonly dependencies?: Readonly<Record<string, string>>;
  readonly devDependencies?: Readonly<Record<string, string>>;
  readonly optionalDependencies?: Readonly<Record<string, string>>;
  readonly peerDependencies?: Readonly<Record<string, string>>;
};
