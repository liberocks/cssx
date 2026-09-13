import { expect, it, vi } from 'vitest';
import { invalidateViteRunner } from './invalidate-vite-runner';

it('invalidates evaluated modules returned from the Vite graph', () => {
  const first = { id: '/project/first.ts' };
  const withoutId = {};
  const cachedFirst = { id: first.id };
  const invalidateModule = vi.fn();
  const environment = {
    moduleGraph: {
      invalidateModule: (
        _module: typeof first | typeof withoutId,
        invalidated: Set<typeof first | typeof withoutId>,
      ) => {
        invalidated.add(_module);
      },
    },
    runner: {
      evaluatedModules: {
        getModuleById: vi.fn((id: string) => (id === first.id ? cachedFirst : undefined)),
        invalidateModule,
      },
    },
  };

  invalidateViteRunner(environment, [first, withoutId], 123);

  expect(environment.runner.evaluatedModules.getModuleById).toHaveBeenCalledWith(first.id);
  expect(invalidateModule).toHaveBeenCalledExactlyOnceWith(cachedFirst);
});

it('does nothing without a module graph or when a module is not evaluated', () => {
  const module = { id: '/project/entry.ts' };
  const noGraph = { runner: { evaluatedModules: { getModuleById: vi.fn(), invalidateModule: vi.fn() } } };
  invalidateViteRunner(noGraph, [module], 456);
  expect(noGraph.runner.evaluatedModules.getModuleById).not.toHaveBeenCalled();

  const noEvaluatedModule = {
    moduleGraph: { invalidateModule: (_module: typeof module, modules: Set<typeof module>) => modules.add(_module) },
    runner: { evaluatedModules: { getModuleById: vi.fn(), invalidateModule: vi.fn() } },
  };
  invalidateViteRunner(noEvaluatedModule, [module], 456);
  expect(noEvaluatedModule.runner.evaluatedModules.invalidateModule).not.toHaveBeenCalled();
});
