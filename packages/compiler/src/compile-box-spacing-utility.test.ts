import { expect, it } from 'vitest';

import { compileBoxSpacingUtility } from './compile-box-spacing-utility';
import { parseTheme } from './theme';

const theme = parseTheme();

it('resolves padding, margin, and gap values into their target properties', () => {
  expect(compileBoxSpacingUtility('p-2', false, theme)).toEqual([{ property: 'padding', value: 'calc(0.25rem * 2)' }]);
  expect(compileBoxSpacingUtility('mx-3', false, theme)).toEqual([
    { property: 'margin-left', value: 'calc(0.25rem * 3)' },
    { property: 'margin-right', value: 'calc(0.25rem * 3)' },
  ]);
  expect(compileBoxSpacingUtility('gap-x-4', false, theme)).toEqual([
    { property: 'column-gap', value: 'calc(0.25rem * 4)' },
  ]);
});

it('supports auto margins and rejects invalid or positional utilities', () => {
  expect(compileBoxSpacingUtility('m-auto', false, theme)).toEqual([{ property: 'margin', value: 'auto' }]);
  expect(compileBoxSpacingUtility('m-auto', true, theme)).toBeNull();
  expect(compileBoxSpacingUtility('p-invalid', false, theme)).toBeNull();
  expect(compileBoxSpacingUtility('inset-x-2', false, theme)).toBeNull();
});
