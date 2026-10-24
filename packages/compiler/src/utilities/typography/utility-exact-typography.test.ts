import { expect, it } from 'vitest';

import { EXACT_TYPOGRAPHY_DECLARATIONS } from './utility-exact-typography';

it('resolves fixed font, smoothing, style, transform, and alignment declarations', () => {
  expect(Object.keys(EXACT_TYPOGRAPHY_DECLARATIONS)).toHaveLength(24);
  expect(EXACT_TYPOGRAPHY_DECLARATIONS['font-bold']).toEqual([{ property: 'font-weight', value: '700' }]);
  expect(EXACT_TYPOGRAPHY_DECLARATIONS.antialiased).toEqual([
    { property: '-webkit-font-smoothing', value: 'antialiased', semanticGroup: 'font-smoothing' },
    { property: '-moz-osx-font-smoothing', value: 'grayscale', semanticGroup: 'font-smoothing' },
  ]);
  expect(EXACT_TYPOGRAPHY_DECLARATIONS.uppercase).toEqual([{ property: 'text-transform', value: 'uppercase' }]);
  expect(EXACT_TYPOGRAPHY_DECLARATIONS['text-center']).toEqual([{ property: 'text-align', value: 'center' }]);
});
