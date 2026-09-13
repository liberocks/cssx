import { expect, it } from 'vitest';

import { compilePrefixedStructuralUtility } from './compile-prefixed-structural-utility';
import { parseTheme } from './theme';

it('routes dimensions, layout, grid, flex, typography, animation, and transforms', () => {
  const theme = parseTheme();
  expect(compilePrefixedStructuralUtility('w-4', false, theme)).toMatchObject({ property: 'width' });
  expect(compilePrefixedStructuralUtility('columns-3', false, theme)).toMatchObject({ property: 'columns' });
  expect(compilePrefixedStructuralUtility('grid-cols-3', false, theme)).toMatchObject({
    property: 'grid-template-columns',
  });
  expect(compilePrefixedStructuralUtility('basis-4', false, theme)).toMatchObject({ property: 'flex-basis' });
  expect(compilePrefixedStructuralUtility('font-[Inter]', false, theme)).toMatchObject({ property: 'font-family' });
  expect(compilePrefixedStructuralUtility('animate-spin', false, theme)).toMatchObject({ property: 'animation' });
  expect(compilePrefixedStructuralUtility('translate-x-2', false, theme)).not.toBeNull();
  expect(compilePrefixedStructuralUtility('not-a-structural-utility', false, theme)).toBeNull();
});
