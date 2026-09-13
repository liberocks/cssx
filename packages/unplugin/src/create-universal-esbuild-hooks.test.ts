import type { BuildResult, PluginBuild } from 'esbuild';
import { expect, it } from 'vitest';

import { createUniversalEsbuildHooks } from './create-universal-esbuild-hooks';
import type { ModuleCssxData } from './module-cssx-data';

it('enables metadata and tracks the active esbuild working directory', async () => {
  let onEnd: ((result: BuildResult) => void | Promise<void>) | undefined;
  const build = {
    initialOptions: { absWorkingDir: '/project', outdir: 'dist' },
    onEnd(callback: (result: BuildResult) => void | Promise<void>) {
      onEnd = callback;
    },
  } as unknown as PluginBuild;
  const hooks = createUniversalEsbuildHooks({
    options: { preflight: false },
    cssFileName: 'cssx.css',
    sourceMap: true,
    dataById: new Map<string, ModuleCssxData>(),
    getTheme: async () => undefined,
  });

  const buildOptions = {};
  hooks.config(buildOptions);
  hooks.setup(build);
  await onEnd?.({} as BuildResult);

  expect(buildOptions).toEqual({ metafile: true });
  expect(hooks.getWorkingDirectory()).toBe('/project');
});

it('emits preflight CSS into in-memory esbuild output files', async () => {
  let onEnd: ((result: BuildResult) => void | Promise<void>) | undefined;
  const build = {
    initialOptions: { absWorkingDir: '/project', outfile: 'dist/app.js', write: false },
    onEnd(callback: (result: BuildResult) => void | Promise<void>) {
      onEnd = callback;
    },
  } as unknown as PluginBuild;
  const hooks = createUniversalEsbuildHooks({
    options: {},
    cssFileName: 'cssx.css',
    sourceMap: true,
    dataById: new Map<string, ModuleCssxData>(),
    getTheme: async () => undefined,
  });
  hooks.setup(build);
  const outputFiles: NonNullable<BuildResult['outputFiles']> = [];

  await onEnd?.({ metafile: { inputs: {} }, outputFiles } as BuildResult);

  expect(outputFiles).toHaveLength(1);
  expect(outputFiles[0]?.path).toBe('/project/dist/cssx.css');
  expect(outputFiles[0]?.text).toContain('box-sizing:border-box');
});
