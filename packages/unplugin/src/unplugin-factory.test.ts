import { expect, it } from 'vitest';

import { unpluginFactory } from './unplugin-factory';

interface FactoryPluginShape {
  readonly name: string;
  readonly transform: { readonly filter: { readonly id: RegExp }; readonly handler: unknown };
  readonly rollup: { readonly generateBundle: unknown };
  readonly vite: {
    readonly generateBundle: unknown;
    readonly configureServer: unknown;
    readonly hotUpdate?: { readonly handler: unknown };
  };
}

it('creates Vite, Rollup, and transform hooks for the selected build tool', () => {
  const plugin = unpluginFactory({ preflight: false }, {
    framework: 'vite',
    versions: {},
  } as never) as unknown as FactoryPluginShape;

  expect(plugin.name).toBe('@cssxio/unplugin');
  expect(plugin.transform).toMatchObject({ filter: { id: expect.any(RegExp) }, handler: expect.any(Function) });
  expect(plugin.rollup.generateBundle).toBeTypeOf('function');
  expect(plugin.vite.generateBundle).toBeTypeOf('function');
  expect(plugin.vite.configureServer).toBeTypeOf('function');
  expect(plugin.vite.hotUpdate?.handler).toBeTypeOf('function');
});

it('rejects invalid options before installing bundler hooks', () => {
  expect(() => unpluginFactory({ sourceMap: 'false' } as never, { framework: 'vite', versions: {} } as never)).toThrow(
    'sourceMap must be a boolean',
  );
});
