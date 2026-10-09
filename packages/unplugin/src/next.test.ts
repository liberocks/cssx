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
  const config = withCSSX(
    {
      webpack: existingWebpack as never,
      turbopack: { rules: { '*.svg': { loaders: ['svg-loader'] } }, resolveAlias: { '@alias': '/alias' } },
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

it('rejects incompatible legacy naming and manifest settings', () => {
  expect(() => withCSSX({}, { stableClassNames: true, coordination: 'manifest' })).toThrow(
    'already selects source naming',
  );
});
