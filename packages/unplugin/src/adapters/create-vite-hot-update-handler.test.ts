import { expect, it, vi } from 'vitest';

import type { ModuleCssxData } from '../transforms/module-cssx-data';
import { createViteHotUpdateHandler } from './create-vite-hot-update-handler';

/** Creates transformed module metadata for a direct Vite hot-update test. */
function moduleData(id: string, cssOnlySignature: string, atomicClasses: readonly string[] = []): ModuleCssxData {
  return { id, rules: [], candidates: {}, composites: {}, origins: {}, cssOnlySignature, atomicClasses };
}

it('skips missing environments and non-CSS-only modules', async () => {
  const module = { id: '/project/style.ts', url: '/src/style.ts' };
  const handler = createViteHotUpdateHandler(new Map([[module.id, moduleData(module.id, 'styles', ['atomic'])]]));

  expect(await handler.call({}, { modules: [module], timestamp: 1 })).toBeUndefined();
  const clientTransform = vi.fn(async () => undefined);
  await expect(
    handler.call(
      { environment: { name: 'client', transformRequest: clientTransform } },
      { modules: [module], timestamp: 1 },
    ),
  ).resolves.toEqual([]);
  expect(clientTransform).toHaveBeenCalledExactlyOnceWith('/src/style.ts');
  await expect(
    handler.call(
      { environment: { name: 'ssr', transformRequest: vi.fn() } },
      { modules: [{ id: '/project/unknown.ts' }, { id: '/project/style.ts' }], timestamp: 1 },
    ),
  ).resolves.toEqual([{ id: '/project/unknown.ts' }]);
});

it('retransforms CSS-only modules without invalidating the server runner and preserves other updates', async () => {
  const handledModule = { id: '/project/style.ts', url: '/src/style.ts' };
  const handledWithoutUrl = { id: '/project/other.ts' };
  const unhandledModule = { id: '/project/script.ts' };
  const moduleDataById = new Map([
    [handledModule.id, moduleData(handledModule.id, 'same-signature', ['atomic'])],
    [handledWithoutUrl.id, moduleData(handledWithoutUrl.id, 'same-signature', ['atomic'])],
    [unhandledModule.id, moduleData(unhandledModule.id, '', ['atomic'])],
  ]);
  const invalidated: unknown[] = [];
  const evaluated: unknown[] = [];
  const transformRequest = vi.fn(async () => undefined);
  const handler = createViteHotUpdateHandler(moduleDataById);
  const environment = {
    name: 'ssr',
    transformRequest,
    moduleGraph: {
      invalidateModule(module: unknown, modules: Set<unknown>) {
        modules.add(module);
        invalidated.push(module);
      },
    },
    runner: {
      evaluatedModules: {
        getModuleById: (id: string) => ({ id }),
        invalidateModule: (module: unknown) => evaluated.push(module),
      },
    },
  };

  await expect(
    handler.call({ environment }, { modules: [handledModule, handledWithoutUrl, unhandledModule], timestamp: 42 }),
  ).resolves.toEqual([unhandledModule]);
  expect(transformRequest).toHaveBeenCalledExactlyOnceWith('/src/style.ts');
  expect(invalidated).toEqual([]);
  expect(evaluated).toEqual([]);
});

it('leaves the update graph alone when a retransform changes CSSX metadata', async () => {
  const module = { id: '/project/style.ts', url: '/src/style.ts' };
  const moduleDataById = new Map([[module.id, moduleData(module.id, 'before')]]);
  const invalidateModule = vi.fn();
  const handler = createViteHotUpdateHandler(moduleDataById);
  const environment = {
    name: 'ssr',
    async transformRequest() {
      moduleDataById.set(module.id, moduleData(module.id, 'after'));
    },
    moduleGraph: { invalidateModule },
  };

  await expect(handler.call({ environment }, { modules: [module], timestamp: 3 })).resolves.toBeUndefined();
  expect(invalidateModule).not.toHaveBeenCalled();
});

it('does not repeat a CSS-only transform already completed by the file-change hook', async () => {
  const module = { id: '/project/style.ts', url: '/src/style.ts' };
  const source = "import { sx } from '@cssxio/cssx'; export const style = sx('bg-red-500');";
  const moduleDataById = new Map([[module.id, moduleData(module.id, 'same-signature', ['atomic'])]]);
  const transformRequest = vi.fn(async () => undefined);
  const handler = createViteHotUpdateHandler(
    moduleDataById,
    (id, transformedSource) => id === module.id && transformedSource === source,
  );

  await expect(
    handler.call(
      { environment: { name: 'client', transformRequest } },
      { modules: [module], timestamp: 3, read: async () => source },
    ),
  ).resolves.toEqual([]);
  expect(transformRequest).not.toHaveBeenCalled();
});

it('shares the incremental CSS-only update with the active Vite watcher', async () => {
  const module = { id: '/project/style.ts', url: '/src/style.ts' };
  const moduleDataById = new Map([[module.id, moduleData(module.id, 'same-signature', ['atomic'])]]);
  const transformRequest = vi.fn(async () => undefined);
  const updateCssOnlySource = vi.fn(async () => true);
  const handler = createViteHotUpdateHandler(moduleDataById, () => false, updateCssOnlySource);

  await expect(
    handler.call({ environment: { name: 'client', transformRequest } }, { modules: [module], timestamp: 3 }),
  ).resolves.toEqual([]);
  expect(updateCssOnlySource).toHaveBeenCalledExactlyOnceWith(module.id);
  expect(transformRequest).not.toHaveBeenCalled();
});

it('leaves structural changes for Vite’s JavaScript transform pipeline', async () => {
  const module = { id: '/project/style.ts', url: '/src/style.ts' };
  const moduleDataById = new Map([[module.id, moduleData(module.id, 'before')]]);
  const transformRequest = vi.fn(async () => {
    moduleDataById.set(module.id, moduleData(module.id, 'after'));
  });
  const updateCssOnlySource = vi.fn(async () => false);
  const handler = createViteHotUpdateHandler(moduleDataById, () => false, updateCssOnlySource);

  await expect(
    handler.call({ environment: { name: 'client', transformRequest } }, { modules: [module], timestamp: 3 }),
  ).resolves.toBeUndefined();
  expect(updateCssOnlySource).toHaveBeenCalledExactlyOnceWith(module.id);
  expect(transformRequest).toHaveBeenCalledExactlyOnceWith(module.url);
});

it('checks CSS-only metadata after reading the current source when no pretransform hook is supplied', async () => {
  const module = { id: '/project/style.ts', url: '/src/style.ts' };
  const source = "import { sx } from '@cssxio/cssx'; export const style = sx('bg-red-500');";
  const moduleDataById = new Map([[module.id, moduleData(module.id, 'same-signature')]]);
  const transformRequest = vi.fn(async () => undefined);
  const handler = createViteHotUpdateHandler(moduleDataById);

  await expect(
    handler.call(
      { environment: { name: 'client', transformRequest } },
      { modules: [module], timestamp: 3, read: async () => source },
    ),
  ).resolves.toEqual([]);
  expect(transformRequest).toHaveBeenCalledExactlyOnceWith('/src/style.ts');
});
