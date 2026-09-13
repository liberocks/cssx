import { expect, it } from 'vitest';

import { compileLogicalInsetUtility } from './compile-logical-inset-utility';
import { parseTheme } from './theme';

it('resolves logical start and end insets with positive and negative values', () => {
  const theme = parseTheme();
  expect(compileLogicalInsetUtility('start-4', false, theme)).toEqual({
    property: 'inset-inline-start',
    value: 'calc(0.25rem * 4)',
  });
  expect(compileLogicalInsetUtility('end-2', true, theme)).toEqual({
    property: 'inset-inline-end',
    value: 'calc(0.25rem * -2)',
  });
  expect(compileLogicalInsetUtility('start-nope', false, theme)).toBeNull();
  expect(compileLogicalInsetUtility('top-4', false, theme)).toBeNull();
});
