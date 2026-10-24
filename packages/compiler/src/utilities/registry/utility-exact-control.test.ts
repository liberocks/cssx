import { expect, it } from 'vitest';

import { EXACT_CONTROL_DECLARATIONS } from './utility-exact-control';

it('resolves fixed control, environment, and SVG declarations', () => {
  expect(Object.keys(EXACT_CONTROL_DECLARATIONS)).toHaveLength(12);
  expect(EXACT_CONTROL_DECLARATIONS['forced-color-adjust-none']).toEqual([
    { property: 'forced-color-adjust', value: 'none' },
  ]);
  expect(EXACT_CONTROL_DECLARATIONS['scheme-light-dark']).toEqual([{ property: 'color-scheme', value: 'light dark' }]);
  expect(EXACT_CONTROL_DECLARATIONS['fill-none']).toEqual([{ property: 'fill', value: 'none' }]);
});
