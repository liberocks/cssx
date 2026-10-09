import { expect, it } from 'vitest';

import { assertPluginOptions } from './assert-plugin-options';

it('rejects incompatible theme options', () => {
  expect(() => assertPluginOptions({ theme: '', themeFile: 'theme.css' })).toThrow('either theme or themeFile');
});

it('validates compiler coordination and diagnostic options', () => {
  for (const sourceRoots of [[null], ['  ']] as never[]) {
    expect(() => assertPluginOptions({ sourceRoots })).toThrow('sourceRoots');
  }
  expect(() => assertPluginOptions({ sourceRoots: [] })).not.toThrow();
  expect(() => assertPluginOptions({ debug: null } as never)).toThrow('debug must be');
  expect(() => assertPluginOptions({ debug: 1 } as never)).toThrow('debug must be');
  expect(() => assertPluginOptions({ debug: {} as never })).toThrow('debug must be');
  expect(() => assertPluginOptions({ debug: { reportFile: 1 } as never })).toThrow('debug must be');
  expect(() => assertPluginOptions({ debug: { reportFile: '' } })).toThrow('debug must be');
  expect(() => assertPluginOptions({ debug: true })).not.toThrow();
  expect(() => assertPluginOptions({ debug: { reportFile: 'report.json' } })).not.toThrow();
  expect(() => assertPluginOptions({ naming: 'invalid' } as never)).toThrow('naming must be');
  expect(() => assertPluginOptions({ coordination: 'invalid' } as never)).toThrow('coordination must be');
  expect(() => assertPluginOptions({ stableClassNames: true, naming: 'hash' })).toThrow('conflicts with naming');
  expect(() => assertPluginOptions({ stableClassNames: true, naming: 'source' })).not.toThrow();
  expect(() => assertPluginOptions({ stableClassNames: true, coordination: 'manifest' })).toThrow(
    'already selects source naming',
  );
  expect(() => assertPluginOptions({ naming: 'hash', className: { variant: 'serial' } })).toThrow('conflicts');
  expect(() => assertPluginOptions({ naming: 'serial', className: { variant: 'random' } })).toThrow('conflicts');
  expect(() => assertPluginOptions({ naming: 'hash', className: { variant: 'random' } })).not.toThrow();
  expect(() => assertPluginOptions({ coordination: 'manifest' })).toThrow('requires manifestPath');
  expect(() => assertPluginOptions({ manifestPath: 'classes.json' })).toThrow('requires coordination');
  expect(() =>
    assertPluginOptions({
      coordination: 'manifest',
      manifestPath: 'classes.json',
      classNameAllocator: { allocate: () => new Map(), reserve: () => undefined },
    }),
  ).toThrow('cannot use a custom classNameAllocator');
  expect(() => assertPluginOptions({ coordination: 'manifest', manifestPath: 'classes.json' })).not.toThrow();
});
