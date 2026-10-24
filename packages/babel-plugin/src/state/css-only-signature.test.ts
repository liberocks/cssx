import { expect, it } from 'vitest';

import { cssOnlySignature } from './css-only-signature';

it('removes utility ranges in source order and preserves all other text', () => {
  const source = 'left p-4 right m-2';
  expect(
    cssOnlySignature(source, [
      { start: source.indexOf('m-2'), end: source.length },
      { start: source.indexOf('p-4'), end: source.indexOf('p-4') + 3 },
    ]),
  ).toBe('left  right ');
  expect(cssOnlySignature(source, [])).toBe(source);
});
