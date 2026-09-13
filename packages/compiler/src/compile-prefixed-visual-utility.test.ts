import { expect, it } from 'vitest';

import { compilePrefixedVisualUtility } from './compile-prefixed-visual-utility';
import { parseTheme } from './theme';

it('routes paint, filter, border, and decoration candidates to visual recipes', () => {
  const theme = parseTheme();
  expect(compilePrefixedVisualUtility('border-x-2', false, theme)).toHaveLength(2);
  expect(compilePrefixedVisualUtility('shadow-[0_0_1px_black]', false, theme)).not.toBeNull();
  expect(compilePrefixedVisualUtility('ring-2', false, theme)).not.toBeNull();
  expect(compilePrefixedVisualUtility('blur-sm', false, theme)).not.toBeNull();
  expect(compilePrefixedVisualUtility('backdrop-blur-sm', false, theme)).not.toBeNull();
  expect(compilePrefixedVisualUtility('bg-linear-to-r', false, theme)).not.toBeNull();
  expect(compilePrefixedVisualUtility('mask-linear-45', false, theme)).not.toBeNull();
  expect(compilePrefixedVisualUtility('bg-blue-500', false, theme)).not.toBeNull();
  expect(compilePrefixedVisualUtility('decoration-red-500', false, theme)).not.toBeNull();
  expect(compilePrefixedVisualUtility('not-a-visual-utility', false, theme)).toBeNull();
});
