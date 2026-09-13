import { expect, it, vi } from 'vitest';

import { createViteHotUpdateHandler } from './create-vite-hot-update-handler';
import type { ModuleCssxData } from './module-cssx-data';

/** Creates transformed module metadata for a direct Vite hot-update test. */
function moduleData(id: string, cssOnlySignature: string, atomicClasses: readonly string[] = []): ModuleCssxData {
  return { id, rules: [], candidates: {}, composites: {}, origins: {}, cssOnlySignature, atomicClasses };
}

it('skips missing, client, and non-CSS-only environments or modules', async () => {
  const module = { id: '/project/style.ts' };
  const handler = createViteHotUpdateHandler(new Map([[module.id, moduleData(module.id, 'styles', ['atomic'])]]));

  expect(await handler.call({}, { modules: [module], timestamp: 1 })).toBeUndefined();
  expect(await handler.call({ environment: { name: 'client' } as never }, { modules: [module], timestamp: 1 })).toBe(
    undefined,
  );
  expect(
    await handler.call(
      { environment: { name: 'ssr', transformRequest: vi.fn() } },
      { modules: [{ id: '/project/unknown.ts' }, { id: '/project/style.ts' }], timestamp: 1 },
    ),
  ).toBeUndefined();
});

it('retransforms CSS-only modules, invalidates the server runner, and preserves other updates', async () => {
  const handledModule = { id: '/project/style.ts', url: '/src/style.ts' };
  const handledWithoutUrl = { id: '/project/other.ts' };
  const unhandledModule = { id: '/project/script.ts' };
  const moduleDataById = new Map([
    [handledModule.id, moduleData(handledModule.id, 'same-signature')],
    [handledWithoutUrl.id, moduleData(handledWithoutUrl.id, 'same-signature')],
    [unhandledModule.id, moduleData(unhandledModule.id, 'script', ['atomic'])],
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
  expect(invalidated).toEqual([handledModule, handledWithoutUrl]);
  expect(evaluated).toEqual([{ id: handledModule.id }, { id: handledWithoutUrl.id }]);
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
