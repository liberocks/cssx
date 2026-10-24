import { expect, it } from 'vitest';

import { EXACT_LAYOUT_DECLARATIONS } from './utility-exact-layout';

it('defines complete declaration records for every exact layout utility', () => {
  expect(Object.keys(EXACT_LAYOUT_DECLARATIONS).length).toBeGreaterThan(100);
  for (const [candidate, declarations] of Object.entries(EXACT_LAYOUT_DECLARATIONS)) {
    expect(candidate).not.toBe('');
    expect(declarations.length, candidate).toBeGreaterThan(0);
    for (const declaration of declarations) {
      expect(declaration.property, candidate).not.toBe('');
      expect(declaration.value, candidate).not.toBe('');
    }
  }
});

it('keeps multi-property layout utilities and semantic groups intact', () => {
  expect(EXACT_LAYOUT_DECLARATIONS['sr-only']).toContainEqual({ property: 'clip-path', value: 'inset(50%)' });
  expect(EXACT_LAYOUT_DECLARATIONS['box-decoration-clone']).toEqual([
    { property: '-webkit-box-decoration-break', value: 'clone', semanticGroup: 'box-decoration-break' },
    { property: 'box-decoration-break', value: 'clone', semanticGroup: 'box-decoration-break' },
  ]);
  expect(EXACT_LAYOUT_DECLARATIONS['object-bottom-right']).toEqual([
    { property: 'object-position', value: 'bottom right' },
  ]);
});
