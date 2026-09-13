import { expect, it } from 'vitest';

import { configureCompilationAsset } from './configure-compilation-asset';
import type { CompilationLike, NativeCompiler } from './native-types';

it('skips server compilers and registers the asset handler for client compilers', async () => {
  let serverHookRegistered = false;
  const compilation: CompilationLike = {
    modules: [{ buildInfo: { cssx: { id: '/app.ts', candidates: { 'p-4': 'padding' } } } }],
    hooks: {
      processAssets: {
        tapPromise(_options, callback) {
          processAssets = callback;
        },
      },
    },
    emitAsset(fileName, source) {
      emitted.push([fileName, source]);
    },
  };
  let processAssets: (() => Promise<void>) | undefined;
  const emitted: Array<[string, unknown]> = [];
  const makeCompiler = (name?: string): NativeCompiler => ({
    name,
    context: '/project',
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
        tap(_pluginName, callback) {
          if (name) {
            serverHookRegistered = true;
          }
          callback(compilation);
        },
      },
    },
  });

  configureCompilationAsset(makeCompiler('server'), 'cssx.css', async () => undefined, undefined, false, 'cssx');
  configureCompilationAsset(
    { ...makeCompiler(), options: { name: 'edge-server' } },
    'cssx.css',
    async () => undefined,
    undefined,
    false,
    'cssx',
  );
  expect(serverHookRegistered).toBe(false);

  configureCompilationAsset(makeCompiler(), 'cssx.css', async () => undefined, undefined, false, 'cssx');
  await processAssets?.();
  expect(emitted.map(([fileName]) => fileName)).toEqual(['cssx.css']);
});
