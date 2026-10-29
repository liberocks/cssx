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
  createViteNativeSourceWatcher: vi.fn(() => ({ close: vi.fn(), unwatch: vi.fn(), watch: vi.fn() })),
}));

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
