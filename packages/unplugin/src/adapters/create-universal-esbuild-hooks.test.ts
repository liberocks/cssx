import type { BuildOptions, PluginBuild } from 'esbuild';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, it, vi } from 'vitest';

import type { ModuleCssxData } from '../transforms/module-cssx-data';
import { transformCssxModule } from '../transforms/transform-cssx-module';
import { createUniversalEsbuildHooks } from './create-universal-esbuild-hooks';

const mocks = vi.hoisted(() => ({
  startDevelopmentCoordinator: vi.fn(),
  startNextDevelopmentServer: vi.fn(),
  stopNextDevelopmentServer: vi.fn(),
  scanProjectCssxSourceModules: vi.fn(),
}));

vi.mock('./development-coordinator', () => ({ startDevelopmentCoordinator: mocks.startDevelopmentCoordinator }));
vi.mock('./next-development-server', () => ({
  startNextDevelopmentServer: mocks.startNextDevelopmentServer,
  stopNextDevelopmentServer: mocks.stopNextDevelopmentServer,
}));
vi.mock('../transforms/project-scan', () => ({
  scanProjectCssxSourceModules: mocks.scanProjectCssxSourceModules,
}));

it('writes production CSS, removes stale output, and handles esbuild output-file collisions', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-universal-esbuild-'));
  const sourcePath = resolve(root, 'src', 'app.tsx');
  const dataById = new Map<string, ModuleCssxData>([[sourcePath, await transformedData(sourcePath)]]);
  let onEnd: ((result: any) => Promise<void>) | undefined;
  const hooks = createUniversalEsbuildHooks({
    options: { preflight: false },
    cssFileName: 'cssx.css',
    sourceMap: true,
    dataById,
    getTheme: async () => undefined,
  });
  const build = {
    initialOptions: { absWorkingDir: root, outfile: 'dist/app.js', write: true },
    onEnd(callback: (result: any) => Promise<void>) {
      onEnd = callback;
    },
  };

  try {
    const buildOptions: BuildOptions = {};
    hooks.config(buildOptions);
    expect(buildOptions.metafile).toBe(true);
    hooks.setup(build as never as PluginBuild);
    expect(hooks.getWorkingDirectory()).toBe(root);
    await expect(hooks.getDevelopmentHmrConnection()).resolves.toBeUndefined();

    await onEnd?.({ errors: [new Error('build failed')], metafile: { inputs: {} } });
    await onEnd?.({});
    await onEnd?.({ metafile: { inputs: { 'src/app.tsx': {} } } });
    const assetPath = join(root, 'dist', 'cssx.css');
    expect(await readFile(assetPath, 'utf8')).toContain('padding:calc(0.25rem * 4)');

    await onEnd?.({ metafile: { inputs: {} } });
    await expect(readFile(assetPath, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

it('adds generated stylesheet files to in-memory output and rejects collisions', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-universal-esbuild-memory-'));
  const sourcePath = resolve(root, 'src', 'app.tsx');
  const dataById = new Map<string, ModuleCssxData>([[sourcePath, await transformedData(sourcePath)]]);
  let onEnd: ((result: any) => Promise<void>) | undefined;
  const hooks = createUniversalEsbuildHooks({
    options: { preflight: false },
    cssFileName: 'cssx.css',
    sourceMap: false,
    dataById,
    getTheme: async () => undefined,
  });
  hooks.setup({
    initialOptions: { absWorkingDir: root, outdir: 'dist', write: false },
    onEnd(callback: (result: any) => Promise<void>) {
      onEnd = callback;
    },
  } as never as PluginBuild);

  try {
    await onEnd?.({ metafile: { inputs: { 'src/app.tsx': {} } } });
    const outputFiles: Array<{ path: string; text: string }> = [];
    await onEnd?.({ metafile: { inputs: { 'src/app.tsx': {} } }, outputFiles });
    expect(outputFiles).toHaveLength(1);
    expect(outputFiles[0]?.text).toContain('padding:calc(0.25rem * 4)');

    await expect(
      onEnd?.({ metafile: { inputs: { 'src/app.tsx': {} } }, outputFiles: [{ path: outputFiles[0]!.path }] }),
    ).rejects.toThrow('CSSX CSS asset collision');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

it('starts and disposes the development coordinator and uses manifest project metadata in production', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-universal-esbuild-dev-'));
  const connection = { port: 45678, token: 'esbuild-test' };
  const stopCoordinator = vi.fn();
  mocks.startNextDevelopmentServer.mockReturnValue(connection);
  mocks.startDevelopmentCoordinator.mockResolvedValue(stopCoordinator);
  mocks.scanProjectCssxSourceModules.mockResolvedValue([]);
  let onDispose: (() => void) | undefined;
  const developmentHooks = createUniversalEsbuildHooks({
    options: { mode: 'development' },
    cssFileName: 'cssx.css',
    sourceMap: false,
    dataById: new Map(),
    getTheme: async () => undefined,
  });
  developmentHooks.setup({
    initialOptions: { absWorkingDir: root },
    onEnd() {},
    onDispose(callback: () => void) {
      onDispose = callback;
    },
  } as never as PluginBuild);

  try {
    await expect(developmentHooks.getDevelopmentHmrConnection()).resolves.toBe(connection);
    expect(mocks.startDevelopmentCoordinator).toHaveBeenCalledWith(
      root,
      join(root, '.cssx/esbuild.css'),
      expect.objectContaining({ mode: 'development', coordination: 'memory' }),
      connection,
    );
    onDispose?.();
    await vi.waitFor(() => expect(stopCoordinator).toHaveBeenCalledOnce());
    expect(mocks.stopNextDevelopmentServer).toHaveBeenCalledWith(root);

    const scanRoot = join(root, 'manifest');
    const manifestHooks = createUniversalEsbuildHooks({
      options: { coordination: 'manifest', manifestPath: join(scanRoot, '.cssx/classes.json') },
      cssFileName: 'cssx.css',
      sourceMap: false,
      dataById: new Map(),
      getTheme: async () => undefined,
    });
    let onEnd: ((result: any) => Promise<void>) | undefined;
    manifestHooks.setup({
      initialOptions: { absWorkingDir: scanRoot, outfile: 'app.js', write: false },
      onEnd(callback: (result: any) => Promise<void>) {
        onEnd = callback;
      },
    } as never as PluginBuild);
    await onEnd?.({ metafile: { inputs: {} }, outputFiles: [] });
    expect(mocks.scanProjectCssxSourceModules).toHaveBeenCalledWith(
      scanRoot,
      expect.objectContaining({
        coordination: 'manifest',
      }),
    );

    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    mocks.startDevelopmentCoordinator.mockRejectedValue(new Error('coordinator failed'));
    const failedDevelopmentHooks = createUniversalEsbuildHooks({
      options: { mode: 'development' },
      cssFileName: 'cssx.css',
      sourceMap: false,
      dataById: new Map(),
      getTheme: async () => undefined,
    });
    let disposeFailedBuild: (() => void) | undefined;
    failedDevelopmentHooks.setup({
      initialOptions: { absWorkingDir: root },
      onEnd() {},
      onDispose(callback: () => void) {
        disposeFailedBuild = callback;
      },
    } as never as PluginBuild);
    disposeFailedBuild?.();
    await vi.waitFor(() => expect(warning).toHaveBeenCalledWith(expect.stringContaining('coordinator failed')));
    await vi.waitFor(() => expect(mocks.stopNextDevelopmentServer).toHaveBeenCalledTimes(2));

    mocks.startNextDevelopmentServer.mockImplementationOnce(() => {
      throw new Error('transport failed');
    });
    const failedRuntimeHooks = createUniversalEsbuildHooks({
      options: { mode: 'development' },
      cssFileName: 'cssx.css',
      sourceMap: false,
      dataById: new Map(),
      getTheme: async () => undefined,
    });
    let disposeFailedRuntime: (() => void) | undefined;
    failedRuntimeHooks.setup({
      initialOptions: { absWorkingDir: root },
      onEnd() {},
      onDispose(callback: () => void) {
        disposeFailedRuntime = callback;
      },
    } as never as PluginBuild);
    disposeFailedRuntime?.();
    await vi.waitFor(() => expect(warning).toHaveBeenCalledWith(expect.stringContaining('transport failed')));
    await vi.waitFor(() => expect(mocks.stopNextDevelopmentServer).toHaveBeenCalledTimes(3));
    warning.mockRestore();
  } finally {
    await rm(root, { recursive: true, force: true });
    mocks.startDevelopmentCoordinator.mockReset();
    mocks.startNextDevelopmentServer.mockReset();
    mocks.stopNextDevelopmentServer.mockReset();
    mocks.scanProjectCssxSourceModules.mockReset();
  }
});

/** Transforms a minimal CSSX module into the metadata passed to esbuild hooks. */
async function transformedData(id: string): Promise<ModuleCssxData> {
  const transformed = await transformCssxModule(
    "import { sx } from '@cssxio/cssx'; export const className = sx('p-4');",
    id,
    { preflight: false },
    undefined,
    { compileCss: false },
  );
  if (!transformed) {
    throw new Error('CSSX source did not produce module metadata.');
  }
  return { id, ...transformed };
}
