import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';

import { createGenerateBundleHandler } from './create-generate-bundle-handler';
import type { RollupLikeContext } from './create-generate-bundle-handler';
import { RULES_METADATA_KEY, type ModuleCssxData } from './module-cssx-data';

it('uses live metadata, prunes stale module data, and emits the compiled stylesheet', async () => {
  const liveData: ModuleCssxData = {
    id: '/project/app.ts',
    rules: [],
    candidates: { 'p-4': 'padding' },
    composites: {},
    origins: {},
    cssOnlySignature: '',
  };
  const staleData: ModuleCssxData = { ...liveData, id: '/project/deleted.ts', candidates: { block: 'stale' } };
  const records: Array<{ readonly fileName: string; readonly source: string }> = [];
  const rollupDataById = new Map([
    [liveData.id, liveData],
    [staleData.id, staleData],
  ]);
  const handler = createGenerateBundleHandler({
    framework: 'rollup',
    options: { preflight: false },
    cssFileName: 'cssx.css',
    sourceMap: false,
    rollupDataById,
    getTheme: async () => undefined,
  });
  const context: RollupLikeContext = {
    getModuleInfo: () => ({ meta: { [RULES_METADATA_KEY]: liveData } }),
    emitFile(asset) {
      records.push(asset);
    },
  };
  const bundle = { 'app.js': { type: 'chunk', modules: { '/project/app.ts': {} } } };

  await handler.call(context, {}, bundle);

  expect(records).toHaveLength(1);
  expect(records[0]?.fileName).toBe('cssx.css');
  expect(records[0]?.source).toContain('.padding{padding:calc(0.25rem * 4);}');
  expect(rollupDataById.has(staleData.id)).toBe(false);
});

it('does not emit an empty stylesheet and rejects output filename collisions', async () => {
  const handler = createGenerateBundleHandler({
    framework: 'rollup',
    options: { preflight: false },
    cssFileName: 'cssx.css',
    sourceMap: false,
    rollupDataById: new Map(),
    getTheme: async () => undefined,
  });
  const emitFile = (asset: { readonly fileName: string; readonly source: string }) => emitted.push(asset);
  const emitted: Array<{ readonly fileName: string; readonly source: string }> = [];
  const context: RollupLikeContext = { getModuleInfo: () => null, emitFile };

  await handler.call(context, {}, {});
  expect(emitted).toEqual([]);

  const collisionHandler = createGenerateBundleHandler({
    framework: 'rollup',
    options: { preflight: false },
    cssFileName: 'cssx.css',
    sourceMap: false,
    rollupDataById: new Map(),
    getTheme: async () => undefined,
  });
  await expect(
    collisionHandler.call(
      {
        ...context,
        getModuleInfo: () => ({ meta: { [RULES_METADATA_KEY]: { id: 'app.ts', candidates: { 'p-4': 'padding' } } } }),
      },
      {},
      {
        'app.js': { type: 'chunk', modules: { 'app.ts': {} } },
        'cssx.css': { type: 'asset' },
      },
    ),
  ).rejects.toThrow('CSSX CSS asset collision');
});

it('scans sources through the persisted manifest for Rollup output', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-rollup-manifest-'));
  const previousCwd = process.cwd();
  const records: Array<{ readonly fileName: string; readonly source: string }> = [];
  try {
    await writeFile(join(root, 'page.tsx'), "import { sx } from '@cssxio/cssx'; export const className = sx('p-4');");
    process.chdir(root);
    const handler = createGenerateBundleHandler({
      framework: 'rollup',
      options: {
        naming: 'serial',
        coordination: 'manifest',
        manifestPath: join(root, '.cssx', 'classnames.json'),
        preflight: false,
      },
      cssFileName: 'cssx.css',
      sourceMap: false,
      rollupDataById: new Map(),
      getTheme: async () => undefined,
    });
    await handler.call({ getModuleInfo: () => null, emitFile: (asset) => records.push(asset) }, {}, {});

    expect(records[0]?.source).toContain('.s0x{padding:calc(0.25rem * 4);}');
  } finally {
    process.chdir(previousCwd);
    await rm(root, { recursive: true, force: true });
  }
});
