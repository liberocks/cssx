import { expect, it } from 'vitest';

import { compileGridFlowUtility } from './compile-grid-flow-utility';

it('resolves automatic grid flow and track sizes', () => {
  expect(compileGridFlowUtility('grid-flow-col-dense')).toEqual({ property: 'grid-auto-flow', value: 'col dense' });
  expect(compileGridFlowUtility('auto-cols-fr')).toEqual({ property: 'grid-auto-columns', value: 'minmax(0, 1fr)' });
  expect(compileGridFlowUtility('auto-rows-min')).toEqual({ property: 'grid-auto-rows', value: 'min-content' });
  expect(compileGridFlowUtility('auto-cols-foo')).toBeNull();
  expect(compileGridFlowUtility('grid-cols-3')).toBeNull();
});
