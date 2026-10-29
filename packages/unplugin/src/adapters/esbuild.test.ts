import { createClassNameAllocator } from '@cssxio/compiler';
import type { Plugin } from 'esbuild';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';

import { canonicalPath } from '../core/canonical-path';
import cssxEsbuild from './esbuild';

const mocks = vi.hoisted(() => ({
  startNextDevelopmentServer: vi.fn(() => ({ port: 45682, token: 'esbuild-adapter' })),
  stopNextDevelopmentServer: vi.fn(),
  publishNextDevelopmentStylesheet: vi.fn().mockResolvedValue(undefined),
  nativeSourceChange: undefined as ((id: string) => void | Promise<void>) | undefined,
  watchNativeSource: vi.fn(),
  unwatchNativeSource: vi.fn(),
  closeNativeSourceWatcher: vi.fn(),
  transformCalls: 0,
  transformError: undefined as unknown,
  transformCodePadding: '',
  createNativeSourceWatcher: vi.fn((onChange: (id: string) => void | Promise<void>) => {
    mocks.nativeSourceChange = onChange;
    return {
      close: mocks.closeNativeSourceWatcher,
      unwatch: mocks.unwatchNativeSource,
      watch: mocks.watchNativeSource,
    };
  }),
}));

vi.mock('./next-development-server', () => ({
  publishNextDevelopmentStylesheet: mocks.publishNextDevelopmentStylesheet,
  startNextDevelopmentServer: mocks.startNextDevelopmentServer,
  stopNextDevelopmentServer: mocks.stopNextDevelopmentServer,
}));
vi.mock('./vite-native-source-watcher', () => ({
  createViteNativeSourceWatcher: mocks.createNativeSourceWatcher,
}));
vi.mock('../transforms/transform', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../transforms/transform')>();
  return {
    ...actual,
    transformCssxModule: async (...args: Parameters<typeof actual.transformCssxModule>) => {
      mocks.transformCalls++;
      if (mocks.transformError !== undefined) {
        throw mocks.transformError;
      }
      const result = await actual.transformCssxModule(...args);
      return result && mocks.transformCodePadding
        ? { ...result, code: result.code + mocks.transformCodePadding }
        : result;
    },
  };
});

afterEach(() => {
  vi.clearAllMocks();
  mocks.startNextDevelopmentServer.mockReset().mockReturnValue({ port: 45682, token: 'esbuild-adapter' });
  mocks.stopNextDevelopmentServer.mockReset();
  mocks.publishNextDevelopmentStylesheet.mockReset().mockResolvedValue(undefined);
  mocks.nativeSourceChange = undefined;
  mocks.watchNativeSource.mockReset();
  mocks.unwatchNativeSource.mockReset();
  mocks.closeNativeSourceWatcher.mockReset();
  mocks.createNativeSourceWatcher.mockClear();
  mocks.transformCalls = 0;
  mocks.transformError = undefined;
  mocks.transformCodePadding = '';
});

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

it('rejects allocator combinations whose naming options would be ignored', () => {
  expect(() =>
    cssxEsbuild({
      classNameAllocator: createClassNameAllocator(),
      className: { prefix: 'custom' },
    }),
  ).toThrow('classNameAllocator owns naming');
});

it('handles development transforms, ignored roots, transport failure, and disposal', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-esbuild-adapter-dev-'));
  const shared = join(root, 'shared');
  const source = join(shared, 'component.tsx');
  await mkdir(shared, { recursive: true });
  await writeFile(source, "import { sx } from '@cssxio/cssx'; export const className = sx('p-4');");
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

  const setup = (absWorkingDir: string) => {
    let onLoad:
      | ((args: { path: string }) => Promise<{ contents: string; watchFiles?: readonly string[] } | undefined>)
      | undefined;
    let onDispose: (() => void) | undefined;
    const build: any = {
      initialOptions: { absWorkingDir, write: false },
      onLoad(_options: unknown, callback: typeof onLoad) {
        onLoad = callback;
      },
      onEnd() {},
      onDispose(callback: () => void) {
        onDispose = callback;
      },
    };
    cssxEsbuild({ mode: 'development', sourceRoots: ['shared'], themeFile: join(absWorkingDir, 'theme.ts') }).setup!(
      build,
    );
    return { load: (path: string) => onLoad?.({ path }), dispose: () => onDispose?.() };
  };

  try {
    await writeFile(join(root, 'theme.ts'), '@theme { --spacing: 2px; }');
    const successful = setup(root);
    const transformed = await successful.load(source);
    expect(transformed?.contents).toContain('new EventSource');
    expect(transformed?.watchFiles).toEqual([join(root, 'theme.ts')]);
    const noStyleSource = join(shared, 'empty.tsx');
    await writeFile(noStyleSource, "import { sx } from '@cssxio/cssx'; export const className = sx('');");
    await successful.load(noStyleSource);
    expect(mocks.unwatchNativeSource).toHaveBeenCalledWith(await canonicalPath(noStyleSource));
    await expect(successful.load(join(root, 'node_modules', 'ignored.tsx'))).resolves.toBeUndefined();
    successful.dispose();
    await vi.waitFor(() => expect(mocks.stopNextDevelopmentServer).toHaveBeenCalledOnce());
    expect(mocks.stopNextDevelopmentServer).toHaveBeenCalledWith(root);

    mocks.startNextDevelopmentServer.mockImplementationOnce(() => {
      throw new Error('transport failed');
    });
    const failedRuntime = setup(root);
    const failedTransform = await failedRuntime.load(source);
    expect(failedTransform?.contents).not.toContain('new EventSource');
    await vi.waitFor(() => expect(warning).toHaveBeenCalledWith(expect.stringContaining('transport failed')));
    failedRuntime.dispose();
    expect(mocks.stopNextDevelopmentServer).toHaveBeenCalledOnce();
  } finally {
    warning.mockRestore();
    await rm(root, { recursive: true, force: true });
  }
});

it('pushes CSS-only edits before esbuild rebuilds and reuses the prepared transform', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-esbuild-native-hmr-'));
  const source = join(root, 'src.tsx');
  let onLoad: ((args: { path: string }) => Promise<unknown>) | undefined;
  let onEnd: ((result: any) => Promise<void>) | undefined;
  let onDispose: (() => void) | undefined;
  const build: any = {
    initialOptions: { absWorkingDir: root, write: false },
    onLoad(_options: unknown, callback: typeof onLoad) {
      onLoad = callback;
    },
    onEnd(callback: typeof onEnd) {
      onEnd = callback;
    },
    onDispose(callback: () => void) {
      onDispose = callback;
    },
  };

  try {
    await writeFile(source, "import { sx } from '@cssxio/cssx'; export const className = sx('p-4');");
    const canonicalSource = await canonicalPath(source);
    cssxEsbuild({ mode: 'development', sourceMap: false, preflight: false }).setup!(build);
    await onLoad?.({ path: source });
    await onEnd?.({ metafile: { inputs: { 'src.tsx': {} } } });
    mocks.publishNextDevelopmentStylesheet.mockClear();
    const initialTransformCount = mocks.transformCalls;

    await mocks.nativeSourceChange?.(join(root, 'untracked.tsx'));
    expect(mocks.transformCalls).toBe(initialTransformCount);

    await writeFile(source, "import { sx } from '@cssxio/cssx'; export const className = sx('p-8');");
    await mocks.nativeSourceChange?.(canonicalSource);
    expect(mocks.transformCalls).toBe(initialTransformCount + 1);
    expect(mocks.publishNextDevelopmentStylesheet).toHaveBeenCalledOnce();
    expect(mocks.publishNextDevelopmentStylesheet.mock.calls[0]?.[1]).toContain('padding');

    await writeFile(source, "import { sx } from '@cssxio/cssx'; export const className = sx('p-8 ');");
    await mocks.nativeSourceChange?.(canonicalSource);
    expect(mocks.transformCalls).toBe(initialTransformCount + 2);
    expect(mocks.publishNextDevelopmentStylesheet).toHaveBeenCalledOnce();

    await mocks.nativeSourceChange?.(canonicalSource);
    expect(mocks.transformCalls).toBe(initialTransformCount + 2);
    await onLoad?.({ path: source });
    expect(mocks.transformCalls).toBe(initialTransformCount + 2);
    expect(mocks.publishNextDevelopmentStylesheet).toHaveBeenCalledOnce();

    const structuralSource =
      "import { sx } from '@cssxio/cssx'; export const className = sx('p-8'); export const extra = sx('m-4');";
    await writeFile(source, structuralSource);
    await mocks.nativeSourceChange?.(canonicalSource);
    expect(mocks.publishNextDevelopmentStylesheet).toHaveBeenCalledOnce();
    await onLoad?.({ path: source });
    expect(mocks.publishNextDevelopmentStylesheet).toHaveBeenCalledTimes(2);

    await writeFile(source, 'export const plain = true;');
    await mocks.nativeSourceChange?.(canonicalSource);
    expect(mocks.publishNextDevelopmentStylesheet).toHaveBeenCalledTimes(2);
    await onLoad?.({ path: source });
    expect(mocks.publishNextDevelopmentStylesheet).toHaveBeenCalledTimes(3);
  } finally {
    onDispose?.();
    await vi.waitFor(() => expect(mocks.stopNextDevelopmentServer).toHaveBeenCalled());
    await rm(root, { recursive: true, force: true });
  }
});

it('coalesces development pushes and prunes deleted CSSX modules', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-esbuild-adapter-push-'));
  const source = join(root, 'src.tsx');
  const cssxSource = "import { sx } from '@cssxio/cssx'; export const className = sx('p-4');";
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  let onLoad: ((args: { path: string }) => Promise<unknown>) | undefined;
  let onEnd: ((result: any) => Promise<void>) | undefined;
  let onDispose: (() => void) | undefined;
  const build: any = {
    initialOptions: { absWorkingDir: root, write: false },
    onLoad(_options: unknown, callback: typeof onLoad) {
      onLoad = callback;
    },
    onEnd(callback: typeof onEnd) {
      onEnd = callback;
    },
    onDispose(callback: () => void) {
      onDispose = callback;
    },
  };

  try {
    await writeFile(source, cssxSource);
    cssxEsbuild({ mode: 'development', sourceMap: false, preflight: false }).setup!(build);
    await onLoad?.({ path: source });
    await writeFile(source, 'export const removedBeforeBuild = true;');
    await onLoad?.({ path: source });
    await writeFile(source, cssxSource);
    await onLoad?.({ path: source });
    await onEnd?.({ metafile: { inputs: { 'src.tsx': {} } } });

    mocks.publishNextDevelopmentStylesheet.mockRejectedValueOnce(new Error('push failed'));
    await writeFile(source, cssxSource.replace("sx('p-4')", "sx('p-8')"));
    await onLoad?.({ path: source });
    expect(warning).toHaveBeenCalledWith(expect.stringContaining('push failed'));
    mocks.publishNextDevelopmentStylesheet.mockRejectedValueOnce('push failed with a string');
    await writeFile(source, cssxSource.replace("sx('p-4')", "sx('p-12')"));
    await onLoad?.({ path: source });
    expect(warning).toHaveBeenCalledWith(expect.stringContaining('push failed with a string'));

    mocks.publishNextDevelopmentStylesheet.mockClear();
    let releasePublish!: () => void;
    let markPublishStarted!: () => void;
    const publishStarted = new Promise<void>((resolve) => {
      markPublishStarted = resolve;
    });
    const publishGate = new Promise<void>((resolve) => {
      releasePublish = resolve;
    });
    mocks.publishNextDevelopmentStylesheet.mockImplementationOnce(async () => {
      markPublishStarted();
      await publishGate;
    });
    await writeFile(source, cssxSource.replace("sx('p-4')", "sx('p-16')"));
    const firstConcurrentLoad = onLoad?.({ path: source });
    await publishStarted;
    await writeFile(source, cssxSource.replace("sx('p-4')", "sx('p-20')"));
    const secondConcurrentLoad = onLoad?.({ path: source });
    const secondLoadCompleted = await Promise.race([
      secondConcurrentLoad!.then(() => true),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 25)),
    ]);
    expect(secondLoadCompleted).toBe(false);
    releasePublish();
    await Promise.all([firstConcurrentLoad, secondConcurrentLoad]);
    expect(mocks.publishNextDevelopmentStylesheet).toHaveBeenCalledTimes(2);
    await onLoad?.({ path: source });
    expect(mocks.publishNextDevelopmentStylesheet).toHaveBeenCalledTimes(2);

    await onEnd?.({ metafile: { inputs: {} } });
    expect(mocks.publishNextDevelopmentStylesheet).toHaveBeenCalledTimes(3);
    await writeFile(source, 'export const plain = true;');
    await onLoad?.({ path: source });
    expect(mocks.publishNextDevelopmentStylesheet).toHaveBeenCalledTimes(3);
    await onEnd?.({ metafile: { inputs: {} } });
    expect(mocks.publishNextDevelopmentStylesheet).toHaveBeenCalledTimes(3);
  } finally {
    onDispose?.();
    warning.mockRestore();
    await vi.waitFor(() => expect(mocks.stopNextDevelopmentServer).toHaveBeenCalled());
    await rm(root, { recursive: true, force: true });
  }
});

it('bounds esbuild prepared transforms and handles watcher and publication errors', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-esbuild-prepared-limit-'));
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  const sources = Array.from({ length: 65 }, (_, index) => join(root, `source-${index}.tsx`));
  let onLoad: ((args: { path: string }) => Promise<any>) | undefined;
  let onEnd: ((result: any) => Promise<void>) | undefined;
  let onDispose: (() => void) | undefined;
  const build: any = {
    initialOptions: { absWorkingDir: root, write: false },
    onLoad(_options: unknown, callback: typeof onLoad) {
      onLoad = callback;
    },
    onEnd(callback: typeof onEnd) {
      onEnd = callback;
    },
    onDispose(callback: () => void) {
      onDispose = callback;
    },
  };
  const initialSource = "import { sx } from '@cssxio/cssx'; export const className = sx('p-4');";

  try {
    for (const source of sources) {
      await writeFile(source, initialSource);
    }
    cssxEsbuild({ mode: 'development', sourceMap: false, preflight: false }).setup!(build);
    for (const source of sources) {
      await onLoad?.({ path: source });
    }
    const inputs = Object.fromEntries(sources.map((source) => [source.slice(root.length + 1), {}]));
    mocks.publishNextDevelopmentStylesheet.mockRejectedValueOnce(new Error('onEnd publication failed'));
    await onEnd?.({ metafile: { inputs }, outputFiles: [] });
    expect(warning).toHaveBeenCalledWith(expect.stringContaining('onEnd publication failed'));
    mocks.publishNextDevelopmentStylesheet.mockRejectedValueOnce('onEnd publication failed with a string');
    await onEnd?.({ metafile: { inputs }, outputFiles: [] });
    expect(warning).toHaveBeenCalledWith(expect.stringContaining('onEnd publication failed with a string'));

    const initialTransformCount = mocks.transformCalls;
    for (let index = 0; index < sources.length; index++) {
      const source = sources[index]!;
      await writeFile(source, "import { sx } from '@cssxio/cssx'; export const className = sx('p-4 ');");
      await mocks.nativeSourceChange?.(await canonicalPath(source));
    }
    expect(mocks.transformCalls).toBe(initialTransformCount + 65);
    await onLoad?.({ path: sources[0]! });
    expect(mocks.transformCalls).toBe(initialTransformCount + 66);
    await onLoad?.({ path: sources[64]! });
    expect(mocks.transformCalls).toBe(initialTransformCount + 66);

    for (let index = 1; index < 64; index++) {
      await onLoad?.({ path: sources[index]! });
    }

    mocks.transformCodePadding = 'x'.repeat(512 * 1024);
    const beforeByteBudgetUpdates = mocks.transformCalls;
    for (let index = 0; index < 17; index++) {
      const source = sources[index]!;
      const nextSource = "import { sx } from '@cssxio/cssx'; export const className = sx('p-4  ');";
      await writeFile(source, nextSource);
      await mocks.nativeSourceChange?.(await canonicalPath(source));
    }
    expect(mocks.transformCalls).toBe(beforeByteBudgetUpdates + 17);
    await onLoad?.({ path: sources[0]! });
    expect(mocks.transformCalls).toBe(beforeByteBudgetUpdates + 18);
    await onLoad?.({ path: sources[16]! });
    expect(mocks.transformCalls).toBe(beforeByteBudgetUpdates + 18);

    mocks.transformCodePadding = 'x'.repeat(8 * 1024 * 1024 + 1);
    await writeFile(sources[64]!, "import { sx } from '@cssxio/cssx'; export const className = sx('p-4 ');");
    await mocks.nativeSourceChange?.(await canonicalPath(sources[64]!));
    const afterOversizedUpdate = mocks.transformCalls;
    await onLoad?.({ path: sources[64]! });
    expect(mocks.transformCalls).toBe(afterOversizedUpdate + 1);
    mocks.transformCodePadding = '';

    mocks.transformError = 'transform failed with a string';
    const errorCount = warning.mock.calls.length;
    await mocks.nativeSourceChange?.(await canonicalPath(sources[64]!));
    expect(warning).toHaveBeenCalledTimes(errorCount + 1);
    expect(warning).toHaveBeenLastCalledWith(expect.stringContaining('transform failed with a string'));

    mocks.transformError = undefined;
    await rm(sources[64]!);
    const warningCountAfterStringError = warning.mock.calls.length;
    await mocks.nativeSourceChange?.(await canonicalPath(sources[64]!));
    expect(warning).toHaveBeenCalledTimes(warningCountAfterStringError);

    await rm(sources[63]!);
    await mkdir(sources[63]!);
    await mocks.nativeSourceChange?.(await canonicalPath(sources[63]!));
    expect(warning).toHaveBeenLastCalledWith(expect.stringContaining('esbuild stylesheet update failed'));
  } finally {
    onDispose?.();
    warning.mockRestore();
    await vi.waitFor(() => expect(mocks.stopNextDevelopmentServer).toHaveBeenCalled());
    await rm(root, { recursive: true, force: true });
  }
});

it('ignores native watcher events for deleted esbuild source files', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-esbuild-deleted-source-'));
  const source = join(root, 'source.tsx');
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  let onLoad: ((args: { path: string }) => Promise<unknown>) | undefined;
  let onDispose: (() => void) | undefined;
  const build: any = {
    initialOptions: { absWorkingDir: root },
    onLoad(_options: unknown, callback: typeof onLoad) {
      onLoad = callback;
    },
    onEnd() {},
    onDispose(callback: () => void) {
      onDispose = callback;
    },
  };

  try {
    await writeFile(source, "import { sx } from '@cssxio/cssx'; export const className = sx('p-4');");
    const sourceId = await canonicalPath(source);
    cssxEsbuild({ mode: 'development' }).setup!(build);
    await onLoad?.({ path: source });
    await rm(source);
    await mocks.nativeSourceChange?.(sourceId);
    expect(warning).not.toHaveBeenCalled();
  } finally {
    onDispose?.();
    warning.mockRestore();
    await vi.waitFor(() => expect(mocks.stopNextDevelopmentServer).toHaveBeenCalled());
    await rm(root, { recursive: true, force: true });
  }
});

it('skips stylesheet pushes when esbuild development has no transport connection', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-esbuild-adapter-no-transport-'));
  const source = join(root, 'src.tsx');
  let onLoad: ((args: { path: string }) => Promise<unknown>) | undefined;
  let onEnd: ((result: any) => Promise<void>) | undefined;
  let onDispose: (() => void) | undefined;
  mocks.startNextDevelopmentServer.mockImplementationOnce(() => undefined as never);
  const build: any = {
    initialOptions: { absWorkingDir: root },
    onLoad(_options: unknown, callback: typeof onLoad) {
      onLoad = callback;
    },
    onEnd(callback: typeof onEnd) {
      onEnd = callback;
    },
    onDispose(callback: () => void) {
      onDispose = callback;
    },
  };
  try {
    await writeFile(source, "import { sx } from '@cssxio/cssx'; export const className = sx('p-4');");
    const canonicalSource = await canonicalPath(source);
    cssxEsbuild({ mode: 'development' }).setup!(build);
    await onLoad?.({ path: source });
    const transformsWithoutTransport = mocks.transformCalls;
    await mocks.nativeSourceChange?.(canonicalSource);
    expect(mocks.transformCalls).toBe(transformsWithoutTransport);
    await onEnd?.({ metafile: { inputs: { 'src.tsx': {} } } });
    await onLoad?.({ path: source });
    expect(mocks.publishNextDevelopmentStylesheet).not.toHaveBeenCalled();
  } finally {
    onDispose?.();
    await vi.waitFor(() => expect(mocks.stopNextDevelopmentServer).toHaveBeenCalled());
    await rm(root, { recursive: true, force: true });
  }
});
