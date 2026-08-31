import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import cssxEsbuild from '../src/esbuild';
import { unpluginFactory } from '../src/index';
import { configureCompilationAsset, storeCompilationData, type NativeCompiler } from '../src/native';
import { compileCssxStylesheet, cssSourceMap, cssWithSourceMapComment } from '../src/stylesheet';
import { source } from './transform-helpers';

const staticSource =
  "import * as cssx from '@cssxio/cssx'; const styles = cssx.create({ root: 'p-4' }); export const props = cssx.props(styles.root);";

function pluginFor(framework: string, options = {}) {
  return unpluginFactory(options, { framework, versions: {} } as never) as any;
}

describe('unplugin lifecycle edges', () => {
  it('handles Rollup metadata fallbacks, pruning, and map asset collisions', async () => {
    const plugin = pluginFor('rollup');
    await plugin.transform.handler(source, '/project/live.ts');
    await plugin.transform.handler(
      "import * as cssx from '@cssxio/cssx'; export const styles = cssx.create({ root: 'text-white' });",
      '/project/stale.ts',
    );
    const emitted: any[] = [];
    const context = {
      emitFile(asset: unknown) {
        emitted.push(asset);
      },
      getModuleInfo() {
        return {
          meta: {
            '@cssxio/unplugin/rules': {
              id: 1,
              rules: 'invalid',
              candidates: 'invalid',
              composites: 'invalid',
              atomicClasses: 'invalid',
              origins: 'invalid',
              cssOnlySignature: 1,
            },
          },
        };
      },
    };
    const bundle = { 'entry.js': { type: 'chunk', modules: { '/project/live.ts': {} } } };

    await plugin.rollup.generateBundle.call(context, {}, bundle);
    expect(emitted[0]?.source).toContain('padding:calc(0.25rem * 5)');
    expect(emitted[0]?.source).not.toContain('color:#fff');

    await expect(
      plugin.rollup.generateBundle.call(context, {}, { ...bundle, 'cssx.css.map': { type: 'asset' } }),
    ).rejects.toThrow('CSS map asset collision');

    const emptyPlugin = pluginFor('rollup');
    const emptyBundle = { 'empty.js': { type: 'chunk', modules: { '/project/unknown.ts': {} } } };
    await emptyPlugin.rollup.generateBundle.call(
      {
        emitFile() {},
        getModuleInfo() {
          return null;
        },
      },
      {},
      emptyBundle,
    );
    await emptyPlugin.rollup.generateBundle.call(
      {
        emitFile() {},
        getModuleInfo() {
          return { meta: { '@cssxio/unplugin/rules': null } };
        },
      },
      {},
      emptyBundle,
    );
    await emptyPlugin.rollup.generateBundle.call(
      {
        emitFile() {},
        getModuleInfo() {
          return { meta: {} };
        },
      },
      {},
      { 'empty.js': { type: 'chunk' } },
    );
  });

  it('serves Vite map, pass-through, and compilation-error responses and cleans deleted files', async () => {
    const plugin = pluginFor('vite');
    let middleware: ((request: any, response: any, next: () => void) => void) | undefined;
    let unlink: ((path: string) => void) | undefined;
    const updates: any[] = [];
    plugin.vite.configureServer({
      config: { base: '/app/' },
      watcher: {
        on(_event: string, listener: (path: string) => void) {
          unlink = listener;
        },
      },
      middlewares: {
        use(handler: typeof middleware) {
          middleware = handler;
        },
      },
      ws: {
        send(update: unknown) {
          updates.push(update);
        },
      },
    });
    await plugin.transform.handler(source, '/project/styles.ts');
    unlink?.('/project/styles.ts');

    let continued = false;
    middleware?.({ url: '/other.css' }, {} as never, () => {
      continued = true;
    });
    expect(continued).toBe(true);
    expect(updates).toHaveLength(2);

    const response: { headers: Record<string, string>; body?: string } = { headers: {} };
    await new Promise<void>((resolvePromise) =>
      middleware?.(
        { url: '/app/cssx.css.map' },
        {
          setHeader(name: string, value: string) {
            response.headers[name] = value;
          },
          end(body?: string) {
            response.body = body;
            resolvePromise();
          },
        },
        resolvePromise,
      ),
    );
    expect(response.headers['Content-Type']).toContain('application/json');
    expect(response.body).toBe('');

    const failingPlugin = pluginFor('vite', { themeFile: 'does-not-exist.css' });
    let failingMiddleware: typeof middleware;
    failingPlugin.vite.configureServer({
      config: {},
      middlewares: {
        use(handler: typeof middleware) {
          failingMiddleware = handler;
        },
      },
      ws: { send() {} },
    });
    const errorResponse: { headers: Record<string, string>; body?: string } = { headers: {} };
    await new Promise<void>((resolvePromise) =>
      failingMiddleware?.(
        { url: '/cssx.css' },
        {
          setHeader(name: string, value: string) {
            errorResponse.headers[name] = value;
          },
          end(body?: string) {
            errorResponse.body = body;
            resolvePromise();
          },
        },
        resolvePromise,
      ),
    );
    expect(errorResponse.headers['Content-Type']).toContain('text/plain');
    expect(errorResponse.body).toContain('does-not-exist.css');

    const nonErrorPlugin = pluginFor('vite', {
      theme: {
        then(_resolve: unknown, reject: (reason: string) => void) {
          reject('theme failed');
        },
      } as never,
    });
    let nonErrorMiddleware: typeof middleware;
    nonErrorPlugin.vite.configureServer({
      config: {},
      middlewares: {
        use(handler: typeof middleware) {
          nonErrorMiddleware = handler;
        },
      },
      ws: { send() {} },
    });
    const nonErrorResponse: { body?: string } = {};
    await new Promise<void>((resolvePromise) =>
      nonErrorMiddleware?.(
        { url: '/cssx.css' },
        {
          setHeader() {},
          end(body?: string) {
            nonErrorResponse.body = body;
            resolvePromise();
          },
        },
        resolvePromise,
      ),
    );
    expect(nonErrorResponse.body).toBe('Unable to compile CSSX development stylesheet.');
  });

  it('suppresses only CSS-only Vite SSR updates and invalidates evaluated modules', async () => {
    const plugin = pluginFor('vite');
    await plugin.transform.handler(staticSource, '/project/styles.ts');
    const module = { id: '/project/styles.ts', url: '/styles.ts' };
    const invalidated: unknown[] = [];
    const evaluated: unknown[] = [];
    const environment = {
      name: 'ssr',
      moduleGraph: {
        invalidateModule(item: unknown, modules: Set<unknown>) {
          modules.add(item);
          modules.add({});
          modules.add({ id: 'not-evaluated' });
          invalidated.push(item);
        },
      },
      runner: {
        evaluatedModules: {
          getModuleById(id: string) {
            return id === '/project/styles.ts' ? { id } : undefined;
          },
          invalidateModule(item: unknown) {
            evaluated.push(item);
          },
        },
      },
      async transformRequest() {
        await plugin.transform.handler(staticSource, '/project/styles.ts');
      },
    };
    const handler = plugin.vite.hotUpdate.handler;
    const remaining = await handler.call({ environment }, { modules: [module], timestamp: 1 });

    expect(remaining).toEqual([]);
    expect(invalidated).toEqual([module]);
    expect(evaluated).toEqual([{ id: '/project/styles.ts' }]);
    expect(
      await handler.call({ environment: { name: 'client' } }, { modules: [module], timestamp: 1 }),
    ).toBeUndefined();
    expect(await handler.call({}, { modules: [], timestamp: 1 })).toBeUndefined();
    expect(await handler.call({ environment }, { modules: [{}], timestamp: 1 })).toBeUndefined();

    await plugin.transform.handler(staticSource, '/project/styles.ts');
    expect(await handler.call({ environment }, { modules: [{ id: '/project/styles.ts' }], timestamp: 1 })).toEqual([]);

    environment.transformRequest = async () => {
      await plugin.transform.handler(`${staticSource}\nexport const changed = true;`, '/project/styles.ts');
    };
    expect(await handler.call({ environment }, { modules: [module], timestamp: 2 })).toBeUndefined();
  });

  it('exercises universal esbuild output, cleanup, and collision lifecycle branches', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cssx-unplugin-esbuild-'));
    try {
      const plugin = pluginFor('esbuild');
      let onEnd: ((result: any) => Promise<void>) | undefined;
      const build: any = {
        initialOptions: { absWorkingDir: root, outfile: 'dist/app.js', write: true },
        onEnd(callback: (result: any) => Promise<void>) {
          onEnd = callback;
        },
      };
      plugin.esbuild.config(build.initialOptions);
      plugin.esbuild.setup(build);
      await onEnd?.({});
      await plugin.transform.handler(source, join(root, 'entry.ts'));
      await onEnd?.({ metafile: { inputs: { 'entry.ts': {} } } });
      const assetPath = join(root, 'dist', 'cssx.css');
      expect(await readFile(assetPath, 'utf8')).toContain('padding:calc(0.25rem * 5)');

      await rm(assetPath);
      await onEnd?.({ metafile: { inputs: {} } });
      await expect(readFile(assetPath, 'utf8')).rejects.toThrow();

      build.initialOptions.write = false;
      await plugin.transform.handler(source, join(root, 'entry.ts'));
      await onEnd?.({ metafile: { inputs: { 'entry.ts': {} } } });

      pluginFor('esbuild').esbuild.setup({ initialOptions: {}, onEnd() {} });
      await expect(
        onEnd?.({ metafile: { inputs: { 'entry.ts': {} } }, outputFiles: [{ path: assetPath }] }),
      ).rejects.toThrow('CSS asset collision');
      await onEnd?.({ metafile: { inputs: { 'entry.ts': {} } } });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('covers direct esbuild loader variants and removes stale disk CSS maps', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cssx-direct-esbuild-'));
    try {
      const paths = ['entry.mjs', 'entry.cjs', 'plain.ts'].map((file) => join(root, file));
      await Promise.all([
        writeFile(paths[0]!, source),
        writeFile(paths[1]!, source),
        writeFile(paths[2]!, 'export const plain = true;'),
      ]);
      let onLoad: ((args: { path: string }) => Promise<any>) | undefined;
      let onEnd: ((result: any) => Promise<void>) | undefined;
      const build: any = {
        initialOptions: { absWorkingDir: root, outdir: 'dist', write: true },
        onLoad(_options: unknown, callback: (args: { path: string }) => Promise<any>) {
          onLoad = callback;
        },
        onEnd(callback: (result: any) => Promise<void>) {
          onEnd = callback;
        },
      };
      cssxEsbuild().setup(build);
      expect((await onLoad?.({ path: paths[0]! }))?.loader).toBe('js');
      expect((await onLoad?.({ path: paths[1]! }))?.loader).toBe('js');
      expect(await onLoad?.({ path: paths[2]! })).toBeUndefined();
      await onEnd?.({ metafile: { inputs: { 'entry.mjs': {}, 'entry.cjs': {} } } });
      const asset = join(root, 'dist', 'cssx.css');
      const map = `${asset}.map`;
      await expect(readFile(asset, 'utf8')).resolves.toContain('padding:calc(0.25rem * 5)');
      await expect(readFile(map, 'utf8')).resolves.toContain('"version":3');
      await rm(asset);
      await rm(map);
      await onEnd?.({ metafile: { inputs: {} } });
      await expect(readFile(asset, 'utf8')).rejects.toThrow();
      await expect(readFile(map, 'utf8')).rejects.toThrow();

      let withoutMapLoad: ((args: { path: string }) => Promise<any>) | undefined;
      let withoutMapEnd: ((result: any) => Promise<void>) | undefined;
      const withoutMapBuild: any = {
        initialOptions: { outdir: 'dist', write: false },
        onLoad(_options: unknown, callback: (args: { path: string }) => Promise<any>) {
          withoutMapLoad = callback;
        },
        onEnd(callback: (result: any) => Promise<void>) {
          withoutMapEnd = callback;
        },
      };
      cssxEsbuild({ sourceMap: false }).setup(withoutMapBuild);
      await withoutMapLoad?.({ path: paths[0]! });
      const outputFiles: any[] = [];
      await withoutMapEnd?.({ metafile: { inputs: { [paths[0]!]: {} } }, outputFiles });
      expect(outputFiles).toHaveLength(1);
      await withoutMapEnd?.({ metafile: { inputs: { 'missing.ts': {} } }, outputFiles: [] });

      let diskWithoutMapLoad: typeof withoutMapLoad;
      let diskWithoutMapEnd: typeof withoutMapEnd;
      const diskWithoutMapBuild: any = {
        initialOptions: { absWorkingDir: root, outdir: 'without-map', write: true },
        onLoad(_options: unknown, callback: typeof withoutMapLoad) {
          diskWithoutMapLoad = callback;
        },
        onEnd(callback: typeof withoutMapEnd) {
          diskWithoutMapEnd = callback;
        },
      };
      cssxEsbuild({ sourceMap: false }).setup(diskWithoutMapBuild);
      await diskWithoutMapLoad?.({ path: paths[0]! });
      await diskWithoutMapEnd?.({ metafile: { inputs: { 'entry.mjs': {} } } });
      await expect(readFile(join(root, 'without-map', 'cssx.css.map'), 'utf8')).rejects.toThrow();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('handles native missing modules, fallback resources, and map collisions', async () => {
    storeCompilationData({ getNativeBuildContext: () => ({ framework: 'vite' }) }, {}, 'cssx');
    storeCompilationData({ getNativeBuildContext: () => ({ framework: 'webpack', loaderContext: {} }) }, {}, 'cssx');

    let processAssets: (() => Promise<void>) | undefined;
    const compilation: any = {
      modules: [{ resource: '/project/entry.ts?query' }],
      hooks: {
        processAssets: {
          tapPromise(_options: unknown, callback: () => Promise<void>) {
            processAssets = callback;
          },
        },
      },
      getAsset(fileName: string) {
        return fileName.endsWith('.map') ? {} : undefined;
      },
      emitAsset() {},
    };
    configureCompilationAsset(
      nativeCompiler(compilation),
      'cssx.css',
      async () => undefined,
      undefined,
      true,
      'cssx',
      new Map([['/project/entry.ts', { id: '/project/entry.ts', candidates: { 'p-4': 'x' }, origins: {} }]]),
    );
    await expect(processAssets?.()).rejects.toThrow('CSS map asset collision');

    let malformedProcessAssets: (() => Promise<void>) | undefined;
    const malformedCompilation: any = {
      modules: [
        {
          buildInfo: {
            cssx: { id: 1, candidates: 'invalid', composites: 'invalid', atomicClasses: 'invalid', origins: 'invalid' },
          },
        },
      ],
      hooks: {
        processAssets: {
          tapPromise(_options: unknown, callback: () => Promise<void>) {
            malformedProcessAssets = callback;
          },
        },
      },
      emitAsset() {},
    };
    configureCompilationAsset(
      nativeCompiler(malformedCompilation),
      'cssx.css',
      async () => undefined,
      undefined,
      true,
      'cssx',
    );
    await malformedProcessAssets?.();
  });

  it('rejects composite conflicts and handles stylesheet outputs without maps', async () => {
    await expect(
      compileCssxStylesheet([
        { id: 'one.ts', candidates: {}, composites: { composite: ['a'] } },
        { id: 'two.ts', candidates: {}, composites: { composite: ['b'] } },
      ]),
    ).rejects.toThrow('composite class collision');
    const stylesheet = await compileCssxStylesheet([{ id: '', candidates: { 'p-4': 'x' } }]);
    expect(stylesheet.map).toBeUndefined();
    expect(cssWithSourceMapComment(stylesheet, 'assets/cssx.css')).toBe(stylesheet.css);
    expect(cssSourceMap({ version: 3, sources: [], names: [], mappings: '' }, 'cssx.css')).toContain(
      '"file":"cssx.css"',
    );
  });
});

function nativeCompiler(compilation: any): NativeCompiler {
  return {
    webpack: {
      Compilation: { PROCESS_ASSETS_STAGE_ADDITIONS: 0 },
      sources: {
        RawSource: class RawSource {
          constructor(readonly source: string) {}
        },
      },
    },
    hooks: {
      thisCompilation: {
        tap(_name, callback) {
          callback(compilation);
        },
      },
    },
  };
}
