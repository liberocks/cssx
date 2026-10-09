import { createClassNameAllocator } from '@cssxio/compiler';
import { resolve } from 'node:path';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { vi } from 'vitest';

import { withCSSX } from './next';

const originalCwd = process.cwd();
const nextExample = resolve(import.meta.dirname, '../../../examples/next');

beforeEach(() => process.chdir(nextExample));
afterEach(() => process.chdir(originalCwd));

it('preserves Next config and wires Webpack and Turbopack with manifest defaults', async () => {
  const existingWebpack = vi.fn((config: Record<string, unknown>) => ({ ...config, existing: true }));
  const sharedRules = { '*.svg': { loaders: ['svg-loader'] } };
  const sharedTurbopackConfig = { rules: sharedRules, resolveAlias: { '@alias': '/alias' } };
  const config = withCSSX(
    {
      webpack: existingWebpack as never,
      turbopack: sharedTurbopackConfig,
    },
    { debug: true },
  );
  const turbopack = config.turbopack as unknown as {
    rules: Record<string, unknown>;
    resolveAlias: Record<string, string>;
  };
  expect(turbopack.rules['*.svg']).toEqual({ loaders: ['svg-loader'] });
  expect(turbopack.rules['*.tsx']).toMatchObject({
    loaders: [{ options: { cssx: { naming: 'serial' }, styleSheetFile: expect.stringContaining('.cssx/next.css') } }],
  });
  expect(turbopack.resolveAlias['@alias']).toBe('/alias');
  expect(turbopack.resolveAlias['@cssxio/unplugin/next-stylesheet.css']).toBeUndefined();
  expect(sharedRules).toEqual({ '*.svg': { loaders: ['svg-loader'] } });
  expect(Object.hasOwn(withCSSX({ turbopack: sharedTurbopackConfig }).turbopack?.rules ?? {}, '*.tsx')).toBe(true);

  const webpackHook = config.webpack as unknown as (
    base: { module: { rules: unknown[] }; resolve: { alias: Record<string, unknown> } },
    context: Record<string, unknown>,
  ) => Promise<{ existing?: boolean; module?: { rules?: unknown[] } }>;
  const webpackConfig = await webpackHook({ module: { rules: [] }, resolve: { alias: {} } }, {});
  expect(existingWebpack).toHaveBeenCalledOnce();
  expect(webpackConfig.existing).toBe(true);
  expect(webpackConfig.module?.rules).toHaveLength(2);
});

it('wraps asynchronous Next config factories', async () => {
  const config = withCSSX(async () => ({ poweredByHeader: false }));
  await expect(config('phase-test', {})).resolves.toMatchObject({
    poweredByHeader: false,
    turbopack: { rules: expect.any(Object) },
  });
});

it('fails clearly when composing an asynchronous Webpack hook', () => {
  const config = withCSSX({ webpack: (async () => ({})) as never });
  const webpackHook = config.webpack as unknown as (
    base: { module: { rules: unknown[] } },
    context: Record<string, unknown>,
  ) => unknown;

  expect(() => webpackHook({ module: { rules: [] } }, {})).toThrow('Next.js does not await webpack hooks');
});

it('fails clearly when the project has no App Router root layout', () => {
  process.chdir(originalCwd);
  try {
    expect(() => withCSSX({})).toThrow('requires an App Router root layout');
  } finally {
    process.chdir(nextExample);
  }
});

it('serializes stable naming, source roots, existing extensions, and a bare stylesheet path', () => {
  const config = withCSSX(
    { pageExtensions: ['tsx', 'js'] },
    { stableClassNames: true, sourceRoots: ['shared'], mdx: { remarkPlugins: ['remark-gfm'] } },
  ) as unknown as {
    pageExtensions: string[];
    turbopack?: { rules?: Record<string, unknown> };
    webpack?: (base: { module?: { rules?: unknown[] } }, context: Record<string, unknown>) => unknown;
  };
  const webpackHook = config.webpack as unknown as (
    base: { module?: { rules?: unknown[] } },
    context: Record<string, unknown>,
  ) => { module: { rules: Array<{ include: string[] }> } };
  const webpackConfig = webpackHook({}, {});
  const sourceRule = webpackConfig.module.rules[0]!;
  const rootRule = webpackConfig.module.rules[1]!;

  expect(sourceRule.include).toContain(resolve(nextExample, 'shared'));
  expect(rootRule.include).toContain(resolve(nextExample, 'shared'));
  expect(config.pageExtensions).toEqual(['tsx', 'js', 'md', 'mdx']);
  expect(config.turbopack?.rules?.['*.tsx']).toMatchObject({
    loaders: [{ options: { cssx: { naming: 'source' } } }],
  });
});

it('invokes a default Webpack hook and reports allocator or Turbopack rule conflicts', () => {
  const config = withCSSX({}) as unknown as {
    webpack?: (base: { module?: { rules?: unknown[] } }, context: Record<string, unknown>) => unknown;
  };
  const webpackHook = config.webpack as unknown as (
    base: { module?: { rules?: unknown[] } },
    context: Record<string, unknown>,
  ) => { module: { rules: unknown[] } };
  expect(webpackHook({}, {}).module.rules).toHaveLength(2);

  expect(() => withCSSX({}, { classNameAllocator: createClassNameAllocator() })).toThrow(
    'cannot serialize classNameAllocator',
  );
  expect(() => withCSSX({ turbopack: { rules: { '*.ts': {} } } })).toThrow('owns turbopack.rules["*.ts"]');
  expect(() => withCSSX({ turbopack: { rules: { '*.md': {} } } })).toThrow('owns turbopack.rules["*.md"]');
});

it('rejects incompatible legacy naming and manifest settings', () => {
  expect(() => withCSSX({}, { stableClassNames: true, coordination: 'manifest' })).toThrow(
    'already selects source naming',
  );
});
