import { describe, expect, it } from 'vitest';
import { serializeCss } from '@cssxio/compiler';
import { unpluginFactory } from '../src/index';
import { pluginFor, source, transformRequired } from './transform-helpers';

describe('CSSX unplugin transform', () => {
  it('does not emit a Rollup or Vite asset for an empty final graph', async () => {
    const plugin = pluginFor('vite');
    const emitted: unknown[] = [];
    await plugin.rollup.generateBundle.call(
      {
        emitFile(asset: unknown) {
          emitted.push(asset);
        },
        getModuleInfo() {
          return null;
        },
      },
      {},
      { 'entry.js': { type: 'chunk', modules: {} } },
    );

    expect(emitted).toEqual([]);
  });

  it('fails deterministically when a final Rollup asset name is already occupied', async () => {
    const plugin = pluginFor('vite');
    const transformed = await plugin.transform.handler(source, '/project/styles.ts');
    await expect(
      plugin.rollup.generateBundle.call(
        {
          emitFile() {},
          getModuleInfo(id: string) {
            return id === '/project/styles.ts' ? { meta: transformed.meta } : null;
          },
        },
        {},
        {
          'entry.js': { type: 'chunk', modules: { '/project/styles.ts': {} } },
          'cssx.css': { type: 'asset' },
        },
      ),
    ).rejects.toThrow('CSS asset collision');
  });

  it('applies CSSX theme overrides and resolves final asset hashes after aggregation', async () => {
    const themed = await transformRequired(
      `import * as cssx from '@cssxio/cssx'; export const styles = cssx.create({ root: 'p-5 bg-brand' });`,
      '/project/theme.ts',
      { theme: '@theme { --spacing: 2px; --color-brand: #123456; }' },
    );
    expect(serializeCss(themed.rules)).toContain('padding:calc(2px * 5)');
    expect(serializeCss(themed.rules)).toContain('background-color:#123456');

    const plugin = unpluginFactory({ cssFileName: 'assets/cssx.[hash].css' }, {
      framework: 'vite',
      versions: {},
    } as never) as any;
    const transformed = await plugin.transform.handler(source, '/project/styles.ts');
    const emitted: any[] = [];
    await plugin.rollup.generateBundle.call(
      {
        emitFile(asset: unknown) {
          emitted.push(asset);
        },
        getModuleInfo(id: string) {
          return id === '/project/styles.ts' ? { meta: transformed.meta } : null;
        },
      },
      {},
      { 'entry.js': { type: 'chunk', modules: { '/project/styles.ts': {} } } },
    );
    expect(emitted[0]?.fileName).toMatch(/^assets\/cssx\.[a-z0-9]+\.css$/);
  });

  it('wraps transformed and final extracted CSS in an optional cascade layer', async () => {
    const transformed = await transformRequired(source, '/project/layer.ts', { layer: 'cssx' });
    expect(serializeCss(transformed.rules)).toMatch(/^@layer cssx\{/);

    const plugin = unpluginFactory({ layer: 'cssx' }, { framework: 'vite', versions: {} } as never) as any;
    await plugin.transform.handler(source, '/project/layer.ts');
    const emitted: any[] = [];
    await plugin.vite.generateBundle.call(
      {
        emitFile(asset: unknown) {
          emitted.push(asset);
        },
        getModuleInfo() {
          return null;
        },
      },
      {},
      { 'entry.js': { type: 'chunk', modules: {} } },
    );

    expect(emitted[0]?.source).toMatch(/^@layer cssx\{/);
  });

  it('rejects unsafe asset paths and ambiguous theme configuration', () => {
    expect(() => unpluginFactory({ cssFileName: '../cssx.css' }, { framework: 'vite', versions: {} } as never)).toThrow(
      'must not escape',
    );
    expect(() =>
      unpluginFactory({ cssFileName: '/tmp/cssx.css' }, { framework: 'vite', versions: {} } as never),
    ).toThrow('relative path');
    expect(() => unpluginFactory({ cssFileName: 'cssx.txt' }, { framework: 'vite', versions: {} } as never)).toThrow(
      'end in .css',
    );
    expect(() =>
      unpluginFactory({ theme: '@theme {}', themeFile: 'theme.css' }, { framework: 'vite', versions: {} } as never),
    ).toThrow('either theme or themeFile');
    expect(() => unpluginFactory({ layer: 'cssx;body' }, { framework: 'vite', versions: {} } as never)).toThrow(
      'valid CSS layer identifier',
    );
  });

  it('registers a file-backed theme as a watch dependency', async () => {
    const plugin = unpluginFactory({ themeFile: 'theme.css' }, { framework: 'vite', versions: {} } as never) as any;
    const watched: string[] = [];
    await plugin.transform.handler.call(
      {
        addWatchFile(path: string) {
          watched.push(path);
        },
      },
      'export const noCssx = true;',
      '/project/empty.ts',
