import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';

import type { CssxPluginOptions } from '../core/options';
import { developmentPluginOptions } from '../core/options';
import type { ModuleCssxData } from '../transforms/module-cssx-data';
import { createRollupDevelopmentNotifier, createRollupDevelopmentRuntime } from './rollup-development-notifier';

const mocks = vi.hoisted(() => ({
  compile: vi.fn(async (modules: readonly unknown[]) => ({ css: `.count-${modules.length}{}`, map: undefined })),
  coordinator: vi.fn(async (...args: unknown[]) => {
    void args;
    return vi.fn();
  }),
  publish: vi.fn(async (connection: unknown, css: string) => {
    void connection;
    void css;
  }),
  startServer: vi.fn(() => ({ port: 4444, token: 'rollup-test' })),
  stopServer: vi.fn(),
  updateProjectScanModule: vi.fn(async () => true),
}));

vi.mock('../native/stylesheet', () => ({
  compileCssxStylesheet: mocks.compile,
  cssWithSourceMapComment: (stylesheet: { readonly css: string }, fileName: string) =>
    `${stylesheet.css}/*# source=${fileName} */`,
}));
vi.mock('./development-coordinator', () => ({ startDevelopmentCoordinator: mocks.coordinator }));
vi.mock('./next-development-server', () => ({
  publishNextDevelopmentStylesheet: mocks.publish,
  startNextDevelopmentServer: mocks.startServer,
  stopNextDevelopmentServer: mocks.stopServer,
}));
vi.mock('../transforms/project-scan', () => ({ updateProjectScanModule: mocks.updateProjectScanModule }));

afterEach(() => {
  vi.clearAllMocks();
  mocks.compile
    .mockReset()
    .mockImplementation(async (modules) => ({ css: `.count-${modules.length}{}`, map: undefined }));
  mocks.coordinator.mockReset().mockResolvedValue(vi.fn());
  mocks.publish.mockReset().mockResolvedValue(undefined);
  mocks.startServer.mockReset().mockReturnValue({ port: 4444, token: 'rollup-test' });
  mocks.stopServer.mockReset();
  mocks.updateProjectScanModule.mockReset().mockResolvedValue(true);
});

it('publishes serialized Rollup stylesheet revisions only after the initial build', async () => {
  const dataById = new Map<string, ModuleCssxData>();
  let ready = false;
  let connection: { port: number; token: string } | undefined = { port: 4444, token: 'rollup-test' };
  const notifier = createRollupDevelopmentNotifier({
    cssFileName: 'rollup.css',
    getTheme: async () => undefined,
    getConnection: () => connection,
    isReady: () => ready,
    options: { mode: 'development' } as CssxPluginOptions,
    sourceMap: false,
    dataById,
  });

  await notifier();
  expect(mocks.compile).not.toHaveBeenCalled();
  ready = true;
  connection = undefined;
  await notifier();
  expect(mocks.compile).not.toHaveBeenCalled();

  connection = { port: 4444, token: 'rollup-test' };
  dataById.set('/src/a.tsx', {
    id: '/src/a.tsx',
    candidates: { 'p-4': 'class-p4' },
    composites: {},
    origins: {},
    rules: [],
    cssOnlySignature: 'same',
  });
  const first = notifier();
  const second = notifier();
  await Promise.all([first, second]);
  expect(mocks.publish).toHaveBeenCalledOnce();
  expect(mocks.publish.mock.calls[0]?.[1]).toContain('rollup.css');
  await notifier();
  expect(mocks.publish).toHaveBeenCalledOnce();

  mocks.publish.mockRejectedValueOnce(new Error('publish error'));
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  try {
    mocks.compile.mockImplementationOnce(async () => ({ css: '.different{}', map: undefined }));
    await notifier();
    expect(warning).toHaveBeenCalledWith(expect.stringContaining('publish error'));
    mocks.publish.mockRejectedValueOnce('publish failed with a string');
    mocks.compile.mockImplementationOnce(async () => ({ css: '.string-error{}', map: undefined }));
    await notifier();
    expect(warning).toHaveBeenCalledWith(expect.stringContaining('publish failed with a string'));
  } finally {
    warning.mockRestore();
  }
});

it('recompiles when another Rollup change arrives during a stylesheet compilation', async () => {
  let releaseCompilation!: () => void;
  let markCompilationStarted!: () => void;
  const compilationStarted = new Promise<void>((resolve) => {
    markCompilationStarted = resolve;
  });
  const compilationGate = new Promise<void>((resolve) => {
    releaseCompilation = resolve;
  });
  mocks.compile.mockImplementationOnce(async () => {
    markCompilationStarted();
    await compilationGate;
    return { css: '.revision-one{}', map: undefined };
  });
  mocks.compile.mockImplementationOnce(async () => ({ css: '.revision-two{}', map: undefined }));
  const notifier = createRollupDevelopmentNotifier({
    cssFileName: 'rollup.css',
    getTheme: async () => undefined,
    getConnection: () => ({ port: 4444, token: 'rollup-test' }),
    isReady: () => true,
    options: { mode: 'development' } as CssxPluginOptions,
    sourceMap: false,
    dataById: new Map(),
  });

  const first = notifier();
  await compilationStarted;
  const second = notifier();
  releaseCompilation();
  await Promise.all([first, second]);

  expect(mocks.compile).toHaveBeenCalledTimes(2);
  expect(mocks.publish).toHaveBeenCalledTimes(2);
});

it('restarts Rollup updates queued as the source queue finishes', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-rollup-queued-update-'));
  const id = join(root, 'source.tsx');
  const latestId = join(root, 'latest.tsx');
  await writeFile(id, 'first-source');
  await writeFile(latestId, 'latest-source');
  const dataById = new Map<string, ModuleCssxData>();
  let markLatestPublished!: () => void;
  const latestPublished = new Promise<void>((resolve) => (markLatestPublished = resolve));
  const transformedSources: string[] = [];
  let requestedFollowup = false;
  mocks.compile.mockImplementation(async (modules) => ({
    css: modules.flatMap((module) => Object.keys((module as ModuleCssxData).candidates)).join(','),
    map: undefined,
  }));
  const runtime = createRollupDevelopmentRuntime<string>({
    cssFileName: 'rollup.css',
    getTheme: async () => undefined,
    options: { mode: 'development' } as CssxPluginOptions,
    root,
    sourceMap: false,
    dataById,
    transformSource: async (source, transformedId) => {
      transformedSources.push(source);
      dataById.set(transformedId, {
        id: transformedId,
        candidates: { [source]: `class-${source}` },
        composites: {},
        origins: {},
        rules: [],
        cssOnlySignature: 'same-structure',
      });
      return source;
    },
  });
  mocks.publish.mockImplementation(async (_connection, css) => {
    if (!requestedFollowup) {
      requestedFollowup = true;
      void runtime.notifyStyles().then(() => {
        queueMicrotask(() => {
          void runtime.updateCssOnlySource(latestId);
        });
      });
    }
    if (css.includes('latest-source')) {
      markLatestPublished();
    }
  });
  dataById.set(id, {
    id,
    candidates: { initial: 'class-initial' },
    composites: {},
    origins: {},
    rules: [],
    cssOnlySignature: 'same-structure',
  });
  dataById.set(latestId, {
    id: latestId,
    candidates: { 'latest-before-update': 'class-latest-before-update' },
    composites: {},
    origins: {},
    rules: [],
    cssOnlySignature: 'same-structure',
  });

  try {
    runtime.buildStart();
    runtime.buildEnd();
    await runtime.updateCssOnlySource(id);
    await latestPublished;

    expect(transformedSources).toEqual(['first-source', 'latest-source']);
    expect(mocks.publish).toHaveBeenCalledTimes(2);
    expect(runtime.takePrepared(latestId, 'latest-source')).toEqual({ handled: true, result: 'latest-source' });
  } finally {
    await runtime.closeWatcher();
    await rm(root, { recursive: true, force: true });
  }
});

it('bounds Rollup prepared transforms and handles watch lifecycle, deletion, and failures', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-rollup-runtime-'));
  const dataById = new Map<string, ModuleCssxData>();
  const options = { mode: 'development' } as CssxPluginOptions;
  let transformedResult: unknown = 'prepared';
  let transformError: unknown;
  let transformCalls = 0;
  const runtime = createRollupDevelopmentRuntime<unknown>({
    cssFileName: 'rollup.css',
    getTheme: async () => undefined,
    options,
    root,
    sourceMap: false,
    dataById,
    transformSource: async (_source, id) => {
      if (id.endsWith('string-error.tsx')) {
        throw transformError;
      }
      transformCalls++;
      const current = dataById.get(id);
      if (current) {
        dataById.set(id, { ...current, candidates: { [`p-${transformCalls}`]: `class-${transformCalls}` } });
      }
      return transformedResult;
    },
  });
  const cssData = (id: string, signature = 'same'): ModuleCssxData => ({
    id,
    candidates: { 'p-4': 'class-p4' },
    composites: {},
    origins: {},
    rules: [],
    cssOnlySignature: signature,
  });
  const source = (index: number) => join(root, `source-${index}.tsx`);

  try {
    await runtime.updateCssOnlySource(source(0));
    runtime.buildStart();
    runtime.buildStart();
    expect(mocks.coordinator).toHaveBeenCalledOnce();
    expect(mocks.coordinator.mock.calls[0]).toHaveLength(4);

    for (let index = 0; index < 65; index++) {
      const id = source(index);
      await writeFile(id, `source-${index}`);
      dataById.set(id, cssData(id));
      await runtime.updateCssOnlySource(id);
    }
    expect(runtime.takePrepared(source(0), 'source-0').handled).toBe(false);
    expect(runtime.takePrepared(source(64), 'wrong-source').handled).toBe(false);
    await runtime.updateCssOnlySource(source(64));
    expect(runtime.takePrepared(source(64), 'source-64')).toEqual({ handled: true, result: 'prepared' });
    expect(runtime.takePrepared(source(64), 'source-64').handled).toBe(false);
    await writeFile(source(64), 'replacement-source');
    await runtime.updateCssOnlySource(source(64));
    runtime.onTransformed(source(64));
    expect(runtime.takePrepared(source(64), 'replacement-source').handled).toBe(false);

    runtime.buildEnd();
    await runtime.notifyStyles();
    expect(mocks.publish).toHaveBeenCalledOnce();
    await runtime.notifyStyles();
    expect(mocks.publish).toHaveBeenCalledOnce();

    transformedResult = { code: 'module', map: { version: 3 } };
    await writeFile(source(64), 'object-result');
    await runtime.updateCssOnlySource(source(64));
    expect(runtime.takePrepared(source(64), 'object-result').handled).toBe(true);
    transformedResult = 17;
    await writeFile(source(64), 'primitive-result');
    await runtime.updateCssOnlySource(source(64));
    expect(runtime.takePrepared(source(64), 'primitive-result').handled).toBe(true);
    transformedResult = { map: () => undefined };
    await writeFile(source(64), 'undefined-json-map');
    await runtime.updateCssOnlySource(source(64));
    expect(runtime.takePrepared(source(64), 'undefined-json-map').handled).toBe(true);
    transformedResult = { map: undefined };
    await writeFile(source(64), 'mapless-result');
    await runtime.updateCssOnlySource(source(64));
    expect(runtime.takePrepared(source(64), 'mapless-result').handled).toBe(true);
    transformedResult = null;
    await writeFile(source(64), 'null-result');
    await runtime.updateCssOnlySource(source(64));
    expect(runtime.takePrepared(source(64), 'null-result').handled).toBe(true);
    transformedResult = 'x'.repeat(8 * 1024 * 1024 + 1);
    await writeFile(source(64), 'oversized-result');
    await runtime.updateCssOnlySource(source(64));
    expect(runtime.takePrepared(source(64), 'oversized-result').handled).toBe(false);

    const deletedId = source(63);
    await runtime.delete(deletedId);
    expect(mocks.updateProjectScanModule).toHaveBeenCalledWith(
      root,
      deletedId,
      developmentPluginOptions(options),
      null,
    );
    dataById.delete(source(64));
    runtime.onTransformed(source(64));

    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      await runtime.updateCssOnlySource(source(0));
      const directoryId = join(root, 'read-directory');
      await mkdir(directoryId);
      dataById.set(directoryId, cssData(directoryId));
      await runtime.updateCssOnlySource(directoryId);
      expect(warning).toHaveBeenCalledWith(expect.stringContaining('Rollup stylesheet update failed'));
      const stringErrorId = join(root, 'string-error.tsx');
      await writeFile(stringErrorId, 'bad');
      dataById.set(stringErrorId, {
        id: stringErrorId,
        candidates: { 'p-4': 'class-p4' },
        composites: {},
        origins: {},
        rules: [],
        cssOnlySignature: 'same',
      });
      transformError = 'transform failed with a string';
      await runtime.updateCssOnlySource(stringErrorId);
      expect(warning).toHaveBeenCalledWith(expect.stringContaining('transform failed with a string'));
    } finally {
      warning.mockRestore();
    }

    await runtime.closeWatcher();
    expect(mocks.stopServer).toHaveBeenCalledWith(root);
    await runtime.updateCssOnlySource(source(64));
    expect(runtime.getConnection()).toBeUndefined();
  } finally {
    await runtime.closeWatcher();
    await rm(root, { recursive: true, force: true });
  }
});

it('evicts Rollup prepared results when their estimated byte budget is full', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-rollup-byte-budget-'));
  const dataById = new Map<string, ModuleCssxData>();
  const options = { mode: 'development' } as CssxPluginOptions;
  const largeResult = 'x'.repeat(512 * 1024);
  const runtime = createRollupDevelopmentRuntime<string>({
    cssFileName: 'rollup.css',
    getTheme: async () => undefined,
    options,
    root,
    sourceMap: false,
    dataById,
    transformSource: async () => largeResult,
  });

  try {
    for (let index = 0; index < 17; index++) {
      const id = join(root, `large-${index}.tsx`);
      const text = `large-${index}`;
      await writeFile(id, text);
      dataById.set(id, {
        id,
        candidates: { 'p-4': 'class-p4' },
        composites: {},
        origins: {},
        rules: [],
        cssOnlySignature: 'same',
      });
      await runtime.updateCssOnlySource(id);
    }
    expect(runtime.takePrepared(join(root, 'large-0.tsx'), 'large-0').handled).toBe(false);
    expect(runtime.takePrepared(join(root, 'large-16.tsx'), 'large-16').handled).toBe(true);
  } finally {
    await runtime.closeWatcher();
    await rm(root, { recursive: true, force: true });
  }
});

it('handles coordinator startup failure, unavailable transports, structural edits, and pending update caps', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-rollup-runtime-errors-'));
  const dataById = new Map<string, ModuleCssxData>();
  const options = { mode: 'development' } as CssxPluginOptions;
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  let result: unknown = 'small';
  let transformError: unknown;
  let enteredTransform!: () => void;
  let releaseTransform!: () => void;
  const transformGate = new Promise<void>((resolve) => (releaseTransform = resolve));
  const transformEntered = new Promise<void>((resolve) => (enteredTransform = resolve));
  const runtime = createRollupDevelopmentRuntime<unknown>({
    cssFileName: 'rollup.css',
    getTheme: async () => undefined,
    options,
    root,
    sourceMap: false,
    dataById,
    transformSource: async (_source, id) => {
      if (id.endsWith('string-error.tsx')) {
        throw transformError;
      }
      if (id.endsWith('blocked.tsx')) {
        enteredTransform();
        await transformGate;
      }
      const current = dataById.get(id);
      if (current && id.endsWith('structural.tsx')) {
        dataById.set(id, { ...current, cssOnlySignature: 'changed-structure' });
      }
      return result;
    },
  });

  try {
    mocks.coordinator.mockRejectedValueOnce(new Error('coordinator failed'));
    mocks.startServer.mockReturnValueOnce(undefined as never);
    runtime.buildStart();
    await vi.waitFor(() => expect(warning).toHaveBeenCalledWith(expect.stringContaining('coordinator failed')));
    runtime.buildEnd();
    await runtime.notifyStyles();
    expect(mocks.compile).not.toHaveBeenCalled();
    const missingId = join(root, 'missing.tsx');
    dataById.set(missingId, {
      id: missingId,
      candidates: { 'p-4': 'class-p4' },
      composites: {},
      origins: {},
      rules: [],
      cssOnlySignature: 'same',
    });
    await runtime.updateCssOnlySource(missingId);
    expect(warning).toHaveBeenCalledTimes(1);

    const structuralId = join(root, 'structural.tsx');
    await writeFile(structuralId, 'structure');
    dataById.set(structuralId, {
      id: structuralId,
      candidates: { 'p-4': 'class-p4' },
      composites: {},
      origins: {},
      rules: [],
      cssOnlySignature: 'same',
    });
    await runtime.updateCssOnlySource(structuralId);
    expect(runtime.takePrepared(structuralId, 'structure').handled).toBe(false);

    const blockedId = join(root, 'blocked.tsx');
    await writeFile(blockedId, 'blocked');
    dataById.set(blockedId, {
      id: blockedId,
      candidates: { 'p-4': 'class-p4' },
      composites: {},
      origins: {},
      rules: [],
      cssOnlySignature: 'same',
    });
    const blockedUpdate = runtime.updateCssOnlySource(blockedId);
    await transformEntered;
    const queuedIds: string[] = [];
    for (let index = 0; index < 256; index++) {
      const id = join(root, `queued-${index}.tsx`);
      queuedIds.push(id);
      await writeFile(id, `queued-${index}`);
      dataById.set(id, {
        id,
        candidates: { 'p-4': 'class-p4' },
        composites: {},
        origins: {},
        rules: [],
        cssOnlySignature: 'same',
      });
      void runtime.updateCssOnlySource(id);
    }
    const overflowId = join(root, 'overflow.tsx');
    await writeFile(overflowId, 'overflow');
    dataById.set(overflowId, {
      id: overflowId,
      candidates: { 'p-4': 'class-p4' },
      composites: {},
      origins: {},
      rules: [],
      cssOnlySignature: 'same',
    });
    void runtime.updateCssOnlySource(overflowId);
    releaseTransform();
    await blockedUpdate;
    await vi.waitFor(() => expect(runtime.takePrepared(queuedIds[255]!, 'queued-255').handled).toBe(true));
    expect(runtime.takePrepared(overflowId, 'overflow').handled).toBe(false);

    result = 'x'.repeat(8 * 1024 * 1024 + 1);
    const tooLargeId = queuedIds[255]!;
    await writeFile(tooLargeId, 'too-large');
    await runtime.updateCssOnlySource(tooLargeId);
    expect(runtime.takePrepared(tooLargeId, 'too-large').handled).toBe(false);
  } finally {
    releaseTransform();
    await runtime.closeWatcher();
    warning.mockRestore();
    await rm(root, { recursive: true, force: true });
  }
});
