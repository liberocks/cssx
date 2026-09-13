import type { Plugin } from 'esbuild';
import { expect, it } from 'vitest';

import cssxEsbuild from './esbuild';

it('enables metafile tracking and registers script and completion hooks', () => {
  let loadFilter: RegExp | undefined;
  let endHandler: (() => void) | undefined;
  const build = {
    initialOptions: {},
    onLoad(options: { readonly filter: RegExp }) {
      loadFilter = options.filter;
    },
    onEnd(handler: () => void) {
      endHandler = handler;
    },
  } as unknown as Parameters<NonNullable<Plugin['setup']>>[0];
  const plugin = cssxEsbuild();

  plugin.setup!(build);

  expect(plugin.name).toBe('@cssxio/unplugin');
  expect(build.initialOptions.metafile).toBe(true);
  expect(loadFilter?.test('module.tsx')).toBe(true);
  expect(loadFilter?.test('module.css')).toBe(false);
  expect(endHandler).toBeDefined();
});
