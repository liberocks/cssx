import { expect, it } from 'vitest';

import { EXACT_DECLARATIONS } from './utility-exact-declarations';
import { EXACT_LAYOUT_DECLARATIONS } from './utility-exact-layout';
import { EXACT_VISUAL_DECLARATIONS } from './utility-exact-visual';

it('composes the complete layout and visual declaration maps', () => {
  const sourceKeys = [...Object.keys(EXACT_LAYOUT_DECLARATIONS), ...Object.keys(EXACT_VISUAL_DECLARATIONS)];

  expect(Object.keys(EXACT_DECLARATIONS)).toHaveLength(new Set(sourceKeys).size);
  expect(EXACT_DECLARATIONS).toEqual({ ...EXACT_LAYOUT_DECLARATIONS, ...EXACT_VISUAL_DECLARATIONS });
});

it('preserves multi-property utility declarations in the composed table', () => {
  expect(EXACT_DECLARATIONS['sr-only']).toHaveLength(9);
  expect(EXACT_DECLARATIONS['not-sr-only']).toHaveLength(8);
  expect(EXACT_DECLARATIONS['box-decoration-clone']).toEqual([
    { property: '-webkit-box-decoration-break', value: 'clone', semanticGroup: 'box-decoration-break' },
    { property: 'box-decoration-break', value: 'clone', semanticGroup: 'box-decoration-break' },
  ]);
});
