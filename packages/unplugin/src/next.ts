import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { assertPluginOptions } from './assert-plugin-options';
import { resolveNextLoaderPath } from './next-loader-path';
import type { CssxPluginOptions } from './options';

/** CommonJS output directory, or undefined for ESM and source module builds. */
const commonJsDirectory = getCommonJsModuleDirectory();
/** Absolute loader path required by both Next.js bundlers. */
const loaderPath = resolveNextLoaderPath(import.meta.url, commonJsDirectory);

/** Subset of Next's Webpack configuration accessed by this adapter. */
type NextWebpackConfig = {
  module?: { rules?: unknown[]; [key: string]: unknown };
  resolve?: { alias?: Record<string, unknown>; [key: string]: unknown };
  [key: string]: unknown;
};

/** Subset of Next's config surface extended by withCSSX. */
type NextConfig = {
  webpack?: (config: NextWebpackConfig, context: Record<string, unknown>) => NextWebpackConfig;
  turbopack?: { rules?: Record<string, unknown>; resolveAlias?: Record<string, string>; [key: string]: unknown };
  distDir?: string;
  [key: string]: unknown;
};

/** Async or sync Next configuration factory accepted by Next.js. */
type NextConfigFactory = (phase: string, context: Record<string, unknown>) => NextConfig | Promise<NextConfig>;

/**
 * Adds CSSX compilation and stylesheet inclusion to a Next.js configuration.
 *
 * @param nextConfig Existing Next.js config object or config factory.
 * @param cssxOptions CSSX compiler, naming, theme, and MDX options.
 * @returns A Next.js config with Webpack and Turbopack CSSX loader rules.
 */
export function withCSSX<T extends NextConfig>(nextConfig: T, cssxOptions?: CssxPluginOptions): T;
export function withCSSX(nextConfig: NextConfigFactory, cssxOptions?: CssxPluginOptions): NextConfigFactory;
export function withCSSX(
  nextConfig: NextConfig | NextConfigFactory,
  cssxOptions: CssxPluginOptions = {},
): NextConfig | NextConfigFactory {
  if (cssxOptions.classNameAllocator) {
    throw new Error('withCSSX cannot serialize classNameAllocator across Next.js compiler workers.');
  }
  const projectRoot = process.cwd();
  if (!hasAppRouterRootLayout(projectRoot)) {
    throw new Error(
      'withCSSX requires an App Router root layout at app/layout.{js,jsx,ts,tsx} or src/app/layout.{js,jsx,ts,tsx}.',
    );
  }
  const manifestPath = resolve(projectRoot, cssxOptions.manifestPath ?? '.cssx/classnames.json');
  const effectiveOptions: CssxPluginOptions = {
    ...cssxOptions,
    naming: cssxOptions.naming ?? (cssxOptions.stableClassNames ? 'source' : 'serial'),
    coordination: cssxOptions.coordination ?? (cssxOptions.stableClassNames ? 'memory' : 'manifest'),
    ...(!cssxOptions.stableClassNames || cssxOptions.coordination === 'manifest' ? { manifestPath } : {}),
  };
  assertPluginOptions(effectiveOptions);

  const configure = (config: NextConfig): NextConfig => {
    const styleSheetFile = resolve(projectRoot, '.cssx/next.css');
    const loaderCssx = { ...effectiveOptions };
    delete loaderCssx.classNameAllocator;
    delete loaderCssx.coordination;
    delete loaderCssx.manifestPath;
    const loaderOptions = {
      projectRoot,
      styleSheetFile,
      importSource: effectiveOptions.importSource ?? '@cssxio/cssx',
      manifestPath,
      development: process.env.NODE_ENV !== 'production',
      cssx: loaderCssx,
      ...(effectiveOptions.mdx ? { mdx: effectiveOptions.mdx } : {}),
    };

    const previousWebpack = config.webpack;
    config.webpack = (baseConfig, context) => {
      const result = previousWebpack ? previousWebpack(baseConfig, context) : baseConfig;
      if (typeof (result as unknown as { then?: unknown }).then === 'function') {
        throw new Error(
          'withCSSX requires a synchronous Next.js webpack callback; Next.js does not await webpack hooks.',
        );
      }
      result.module ??= { rules: [] };
      result.module.rules ??= [];
      result.module.rules.push({
        test: /\.(?:[cm]?[jt]sx?)$/,
        include: [projectRoot, ...(cssxOptions.sourceRoots ?? []).map((path) => resolve(projectRoot, path))],
        enforce: 'pre',
        use: [{ loader: loaderPath, options: loaderOptions }],
      });
      result.module.rules.push({
        test: /\.(?:md|mdx)$/,
        include: [projectRoot, ...(cssxOptions.sourceRoots ?? []).map((path) => resolve(projectRoot, path))],
        type: 'javascript/auto',
        use: [{ loader: loaderPath, options: loaderOptions }],
      });
      return result;
    };

    const turbopack = config.turbopack ?? {};
    const rules = turbopack.rules ?? {};
    for (const pattern of ['*.js', '*.jsx', '*.ts', '*.tsx']) {
      if (rules[pattern]) {
        throw new Error(
          `withCSSX owns turbopack.rules["${pattern}"]; merge the CSSX loader into that rule explicitly.`,
        );
      }
      rules[pattern] = {
        loaders: [{ loader: loaderPath, options: loaderOptions }],
      };
    }
    for (const pattern of ['*.md', '*.mdx']) {
      if (rules[pattern]) {
        throw new Error(`withCSSX owns turbopack.rules["${pattern}"]; configure MDX through the CSSX mdx option.`);
      }
      rules[pattern] = {
        loaders: [{ loader: loaderPath, options: loaderOptions }],
        as: '*.js',
      };
    }
    config.turbopack = { ...turbopack, rules };
    const pageExtensions = Array.isArray(config.pageExtensions) ? config.pageExtensions : ['js', 'jsx', 'ts', 'tsx'];
    config.pageExtensions = [...new Set([...pageExtensions, 'md', 'mdx'])];
    return config;
  };

  if (typeof nextConfig === 'function') {
    return async (phase, context) => configure(await nextConfig(phase, context));
  }
  return configure(nextConfig);
}

export default withCSSX;

/** Checks for the App Router entry point where Next permits global stylesheet imports. */
function hasAppRouterRootLayout(projectRoot: string): boolean {
  const extensions = ['js', 'jsx', 'ts', 'tsx'];
  return ['app', 'src/app'].some((directory) =>
    extensions.some((extension) => existsSync(resolve(projectRoot, directory, `layout.${extension}`))),
  );
}

/** Returns the CommonJS output directory when loaded from the package's CommonJS entry. */
function getCommonJsModuleDirectory(): string | undefined {
  // The CommonJS branch is verified against the built package in the release workflow.
  /* v8 ignore next */
  return typeof __dirname === 'string' ? __dirname : undefined;
}
