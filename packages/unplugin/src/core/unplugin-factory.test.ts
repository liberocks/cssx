import { createClassNameAllocator } from '@cssxio/compiler';
import { expect, it } from 'vitest';

import { unpluginFactory } from './unplugin-factory';

interface FactoryPluginShape {
  readonly name: string;
  readonly transform: { readonly filter: { readonly id: RegExp }; readonly handler: unknown };
  readonly rollup: { readonly generateBundle: unknown };
  readonly vite: {
    readonly generateBundle: unknown;
    readonly configureServer: unknown;
    readonly transformIndexHtml?: { readonly handler: unknown };
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
  expect(plugin.vite.transformIndexHtml?.handler).toBeTypeOf('function');
  expect(plugin.vite.hotUpdate?.handler).toBeTypeOf('function');
});

it('matches source extensions before query strings', () => {
  const plugin = unpluginFactory({ preflight: false }, { framework: 'vite', versions: {} } as never) as unknown as {
    readonly transform: { readonly filter: { readonly id: RegExp } };
  };

  expect(plugin.transform.filter.id.test('/src/component.tsx?import')).toBe(true);
  expect(plugin.transform.filter.id.test('/src/theme.css?import')).toBe(false);
});

it('injects one development stylesheet bridge into browser HTML and omits it for production builds', async () => {
  const plugin = unpluginFactory({ mode: 'development' }, { framework: 'vite', versions: {} } as never) as unknown as {
    readonly vite: {
      readonly configResolved: (config: { command: 'build' | 'serve' }) => void;
      readonly transformIndexHtml: {
        readonly handler: (
          html: string,
          context: { readonly server?: object },
        ) => Promise<
          | readonly {
              readonly tag: string;
              readonly attrs?: Record<string, string | boolean>;
              readonly children?: string;
            }[]
          | undefined
        >;
      };
    };
  };

  const tags = await plugin.vite.transformIndexHtml.handler('<html></html>', { server: {} });
  expect(tags).toMatchObject([
    {
      tag: 'script',
      attrs: { type: 'module' },
      children: expect.stringContaining('new EventSource(import.meta.env.BASE_URL + "cssx.css.events")'),
    },
  ]);

  plugin.vite.configResolved({ command: 'build' });
  await expect(plugin.vite.transformIndexHtml.handler('<html></html>', { server: {} })).resolves.toBeUndefined();
});

it('rejects invalid options before installing bundler hooks', () => {
  expect(() => unpluginFactory({ sourceMap: 'false' } as never, { framework: 'vite', versions: {} } as never)).toThrow(
    'sourceMap must be a boolean',
  );
});

it('rejects custom allocator conflicts before creating build hooks', () => {
  expect(() =>
    unpluginFactory({ classNameAllocator: createClassNameAllocator(), className: { prefix: 'custom' } }, {
      framework: 'rollup',
      versions: {},
    } as never),
  ).toThrow('classNameAllocator owns naming');
});
