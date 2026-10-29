import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it, vi } from 'vitest';

import type { CssxPluginOptions } from '../core/options';
import type { ModuleCssxData } from '../transforms/module-cssx-data';
import type { ViteDevelopmentServerOptions, ViteServerLike } from './configure-vite-development-server';
import { createViteDevelopmentRuntime } from './vite-development-runtime';

const mocks = vi.hoisted(() => ({
  compileStylesheet: vi.fn(async () => ({ css: '.test{padding:1px;}', map: undefined })),
  sendStyles: vi.fn(),
  watchSource: vi.fn(),
  unwatchSource: vi.fn(),
  closeSourceWatcher: vi.fn(),
}));

vi.mock('./configure-vite-development-server', () => ({
  compileViteDevelopmentStylesheet: mocks.compileStylesheet,
  configureViteDevelopmentServer: vi.fn(),
}));
vi.mock('./vite-dev', () => ({
  connectViteStylesheetClient: vi.fn(),
  sendViteStyles: mocks.sendStyles,
}));
vi.mock('./vite-native-source-watcher', () => ({
  createViteNativeSourceWatcher: vi.fn(() => ({
    close: mocks.closeSourceWatcher,
    unwatch: mocks.unwatchSource,
    watch: mocks.watchSource,
  })),
}));

it('tracks transformed CSSX sources as prepared and unwatches modules without style data', () => {
  const id = '/workspace/src/source.tsx';
  const source = `import { sx } from '@cssxio/cssx'; export const value = sx('p-4');`;
  const dataById = new Map<string, ModuleCssxData>([
    [id, { id, candidates: { 'p-4': 'class-p4' }, composites: {}, origins: {}, rules: [], cssOnlySignature: 'stable' }],
  ]);
  const server = {
    config: { root: '/workspace' },
    middlewares: { use: vi.fn() },
    watcher: { on: vi.fn() },
  } as unknown as ViteServerLike;
  const configuration: ViteDevelopmentServerOptions = {
    cssFileName: 'cssx.css',
    options: { mode: 'development' } as CssxPluginOptions,
    rollupDataById: dataById,
    sourceMap: false,
    getTheme: async () => undefined,
  };
  const runtime = createViteDevelopmentRuntime(server, configuration, dataById, async () => undefined);

  try {
    runtime.onTransformed(id, source);

    expect(runtime.isPrepared(id, source)).toBe(true);
    expect(mocks.watchSource).toHaveBeenCalledWith(id);

    dataById.set(id, { id, candidates: {}, composites: {}, origins: {}, rules: [], cssOnlySignature: '' });
    runtime.onTransformed(id, source);

    expect(runtime.isPrepared(id, source)).toBe(false);
    expect(mocks.unwatchSource).toHaveBeenCalledWith(id);
  } finally {
    runtime.close();
  }
});

it('bounds prepared Vite updates and refreshes an existing prepared source', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-vite-prepared-updates-'));
  const dataById = new Map<string, ModuleCssxData>();
  const listeners = new Map<string, (...args: any[]) => void>();
  const server = {
    config: { root },
    middlewares: { use: vi.fn() },
    watcher: { on: vi.fn((event: string, listener: (...args: any[]) => void) => listeners.set(event, listener)) },
  } as unknown as ViteServerLike;
  const configuration: ViteDevelopmentServerOptions = {
    cssFileName: 'cssx.css',
    options: { mode: 'development' } as CssxPluginOptions,
    rollupDataById: dataById,
    sourceMap: false,
    getTheme: async () => undefined,
  };
  const runtime = createViteDevelopmentRuntime(server, configuration, dataById, async () => undefined);

  try {
    for (let index = 0; index < 65; index++) {
      const id = join(root, `source-${index}.tsx`);
      await writeFile(id, `import { sx } from '@cssxio/cssx'; export const value = sx('p-4');`);
      dataById.set(id, {
        id,
        candidates: { 'p-4': 'class-p4' },
        composites: {},
        origins: {},
        rules: [],
        cssOnlySignature: 'stable-css',
      });
      await runtime.updateCssOnlySource(id);
    }

    expect(
      runtime.isPrepared(
        join(root, 'source-0.tsx'),
        `import { sx } from '@cssxio/cssx'; export const value = sx('p-4');`,
      ),
    ).toBe(false);
    const newest = join(root, 'source-64.tsx');
    const changedSource = `import { sx } from '@cssxio/cssx'; export const value = sx('p-8');`;
    await writeFile(newest, changedSource);
    await runtime.updateCssOnlySource(newest);
    expect(runtime.isPrepared(newest, changedSource)).toBe(true);
    expect(mocks.compileStylesheet).toHaveBeenCalledTimes(66);

    runtime.close();
    await runtime.updateCssOnlySource(newest);
    expect(mocks.compileStylesheet).toHaveBeenCalledTimes(66);
    expect(listeners.has('close')).toBe(true);
  } finally {
    runtime.close();
    await rm(root, { recursive: true, force: true });
  }
});

it('coalesces duplicate file notifications while keeping one transform and stylesheet compile', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-vite-coalesced-updates-'));
  const id = join(root, 'source.tsx');
  const source = `import { sx } from '@cssxio/cssx'; export const value = sx('p-8');`;
  const dataById = new Map<string, ModuleCssxData>([
    [
      id,
      {
        id,
        candidates: { 'p-4': 'class-p4' },
        composites: {},
        origins: {},
        rules: [],
        cssOnlySignature: 'stable-css',
      },
    ],
  ]);
  const transformSource = vi.fn(async () => undefined);
  const server = {
    config: { root },
    middlewares: { use: vi.fn() },
  } as unknown as ViteServerLike;
  const configuration: ViteDevelopmentServerOptions = {
    cssFileName: 'cssx.css',
    options: { mode: 'development' } as CssxPluginOptions,
    rollupDataById: dataById,
    sourceMap: false,
    getTheme: async () => undefined,
  };
  const runtime = createViteDevelopmentRuntime(server, configuration, dataById, transformSource);

  try {
    mocks.compileStylesheet.mockClear();
    await writeFile(id, source);
    await expect(Promise.all([runtime.updateCssOnlySource(id), runtime.updateCssOnlySource(id)])).resolves.toEqual([
      true,
      true,
    ]);

    expect(transformSource).toHaveBeenCalledExactlyOnceWith(source, id);
    expect(mocks.compileStylesheet).toHaveBeenCalledOnce();
  } finally {
    runtime.close();
    await rm(root, { recursive: true, force: true });
  }
});

it('retries a partial watcher read with Vite’s stable source before passing through HMR', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-vite-stable-source-'));
  const id = join(root, 'source.tsx');
  const stableSource = "import { sx } from '@cssxio/cssx'; export const value = sx('p-8');";
  const previous: ModuleCssxData = {
    id,
    candidates: { 'p-4': 'class-p4' },
    composites: {},
    origins: {},
    rules: [],
    cssOnlySignature: 'stable-css',
  };
  const dataById = new Map([[id, previous]]);
  let markTransformStarted!: () => void;
  let finishPartialTransform!: () => void;
  const transformStarted = new Promise<void>((resolve) => {
    markTransformStarted = resolve;
  });
  const partialTransform = new Promise<void>((resolve) => {
    finishPartialTransform = resolve;
  });
  const transformSource = vi.fn(async (source: string, transformId: string) => {
    expect(transformId).toBe(id);
    if (source === '') {
      markTransformStarted();
      await partialTransform;
      dataById.set(id, { ...previous, cssOnlySignature: '' });
      return;
    }
    dataById.set(id, { ...previous, candidates: { 'p-8': 'class-p8' } });
  });
  const server = { config: { root }, middlewares: { use: vi.fn() } } as unknown as ViteServerLike;
  const configuration: ViteDevelopmentServerOptions = {
    cssFileName: 'cssx.css',
    options: { mode: 'development' } as CssxPluginOptions,
    rollupDataById: dataById,
    sourceMap: false,
    getTheme: async () => undefined,
  };
  const runtime = createViteDevelopmentRuntime(server, configuration, dataById, transformSource);

  try {
    mocks.compileStylesheet.mockClear();
    await writeFile(id, '');
    const watcherUpdate = runtime.updateCssOnlySource(id);
    await transformStarted;
    const viteUpdate = runtime.updateCssOnlySource(id, stableSource);
    finishPartialTransform();

    await expect(Promise.all([watcherUpdate, viteUpdate])).resolves.toEqual([true, true]);
    expect(transformSource.mock.calls).toEqual([
      ['', id],
      [stableSource, id],
    ]);
    expect(dataById.get(id)?.candidates).toEqual({ 'p-8': 'class-p8' });
    expect(mocks.compileStylesheet).toHaveBeenCalledOnce();
  } finally {
    runtime.close();
    await rm(root, { recursive: true, force: true });
  }
});

it('reports composition changes for Vite to pass through its normal transform pipeline', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-vite-structural-update-'));
  const id = join(root, 'source.tsx');
  const source = `import { sx } from '@cssxio/cssx'; export const value = sx('p-8');`;
  const previous: ModuleCssxData = {
    id,
    candidates: { 'p-4': 'class-p4' },
    composites: {},
    origins: {},
    rules: [],
    cssOnlySignature: 'stable-css',
  };
  const dataById = new Map([[id, previous]]);
  const transformSource = vi.fn(async () => {
    dataById.set(id, { ...previous, candidates: { 'p-8': 'class-p8' }, cssOnlySignature: 'changed-structure' });
  });
  const server = {
    config: { root },
    middlewares: { use: vi.fn() },
  } as unknown as ViteServerLike;
  const configuration: ViteDevelopmentServerOptions = {
    cssFileName: 'cssx.css',
    options: { mode: 'development' } as CssxPluginOptions,
    rollupDataById: dataById,
    sourceMap: false,
    getTheme: async () => undefined,
  };
  const runtime = createViteDevelopmentRuntime(server, configuration, dataById, transformSource);

  try {
    mocks.compileStylesheet.mockClear();
    await writeFile(id, source);
    await expect(runtime.updateCssOnlySource(id)).resolves.toBe(false);
    expect(dataById.get(id)).toBe(previous);
    expect(mocks.compileStylesheet).not.toHaveBeenCalled();
  } finally {
    runtime.close();
    await rm(root, { recursive: true, force: true });
  }
});

it('limits concurrent Vite transforms and drops paths beyond the bounded queue', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-vite-update-limit-'));
  const ids: string[] = [];
  const dataById = new Map<string, ModuleCssxData>();
  for (let index = 0; index <= 256; index++) {
    const id = join(root, `source-${index}.tsx`);
    ids.push(id);
    await writeFile(id, `import { sx } from '@cssxio/cssx'; export const value = sx('p-${index + 1}');`);
    dataById.set(id, {
      id,
      candidates: { 'p-4': 'class-p4' },
      composites: {},
      origins: {},
      rules: [],
      cssOnlySignature: 'stable-css',
    });
  }
  const server = {
    config: { root },
    middlewares: { use: vi.fn() },
  } as unknown as ViteServerLike;
  const configuration: ViteDevelopmentServerOptions = {
    cssFileName: 'cssx.css',
    options: { mode: 'development' } as CssxPluginOptions,
    rollupDataById: dataById,
    sourceMap: false,
    getTheme: async () => undefined,
  };
  let releaseTransforms!: () => void;
  let notifyTransformsStarted!: () => void;
  const transformGate = new Promise<void>((resolve) => (releaseTransforms = resolve));
  const transformsStarted = new Promise<void>((resolve) => (notifyTransformsStarted = resolve));
  let activeTransforms = 0;
  let maximumActiveTransforms = 0;
  const transformSource = vi.fn(async () => {
    activeTransforms++;
    maximumActiveTransforms = Math.max(maximumActiveTransforms, activeTransforms);
    if (activeTransforms === 4) {
      notifyTransformsStarted();
    }
    await transformGate;
    activeTransforms--;
  });
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  const runtime = createViteDevelopmentRuntime(server, configuration, dataById, transformSource);

  try {
    mocks.compileStylesheet.mockClear();
    const pendingUpdates = ids.slice(0, 256).map((id) => runtime.updateCssOnlySource(id));
    await transformsStarted;
    await runtime.updateCssOnlySource(ids[256]!);
    await runtime.updateCssOnlySource(ids[256]!);

    expect(transformSource).toHaveBeenCalledTimes(4);
    expect(maximumActiveTransforms).toBe(4);
    expect(warning).toHaveBeenCalledOnce();

    releaseTransforms();
    await Promise.all(pendingUpdates);
    expect(transformSource).toHaveBeenCalledTimes(256);
    expect(maximumActiveTransforms).toBe(4);
  } finally {
    releaseTransforms();
    warning.mockRestore();
    runtime.close();
    await rm(root, { recursive: true, force: true });
  }
});
