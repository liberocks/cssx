import { expect, it } from 'vitest';

import { storeCompilationData } from './store-compilation-data';

it('stores metadata only when a webpack or Rspack module is available', () => {
  const module: { buildInfo?: Record<string, unknown> } = { buildInfo: { existing: true } };
  storeCompilationData({}, { candidates: {} }, 'cssx');
  storeCompilationData({ getNativeBuildContext: () => ({ framework: 'vite' }) }, {}, 'cssx');
  storeCompilationData({ getNativeBuildContext: () => ({ framework: 'webpack' }) }, {}, 'cssx');
  expect(module.buildInfo).toEqual({ existing: true });

  storeCompilationData(
    { getNativeBuildContext: () => ({ framework: 'rspack', loaderContext: { _module: module } }) },
    { candidates: { 'p-4': 'padding' } },
    'cssx',
  );
  expect(module.buildInfo).toEqual({ existing: true, cssx: { candidates: { 'p-4': 'padding' } } });
});
