import { expect, it } from 'vitest';

import { compilePositionSpacingUtility } from './compile-position-spacing-utility';
import { parseTheme } from './theme';

const theme = parseTheme();

it('resolves inset and positional dimensions, including negative values', () => {
  expect(compilePositionSpacingUtility('inset-x-full', true, theme)).toEqual([
    { property: 'left', value: '-100%' },
    { property: 'right', value: '-100%' },
  ]);
  expect(compilePositionSpacingUtility('top-4', false, theme)).toEqual([
    { property: 'top', value: 'calc(0.25rem * 4)' },
  ]);
  expect(compilePositionSpacingUtility('inset-bs-2', false, theme)).toEqual([
    { property: 'inset-block-start', value: 'calc(0.25rem * 2)' },
  ]);
});

it('rejects invalid values and non-positional utilities', () => {
  expect(compilePositionSpacingUtility('inset-x-invalid', false, theme)).toBeNull();
  expect(compilePositionSpacingUtility('p-2', false, theme)).toBeNull();
});
