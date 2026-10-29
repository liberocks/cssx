import { expect, it } from 'vitest';

import { cssOnlySignature } from './css-only-signature';

it('hashes retained source text consistently without retaining CSSX utility literals', () => {
  const source = 'left p-4 right m-2';
  const ranges = [
    { start: source.indexOf('m-2'), end: source.length },
    { start: source.indexOf('p-4'), end: source.indexOf('p-4') + 3 },
  ];
  const changedUtilities = 'left p-8 right m-6';
  const changedRanges = [
    { start: changedUtilities.indexOf('m-6'), end: changedUtilities.length },
    { start: changedUtilities.indexOf('p-8'), end: changedUtilities.indexOf('p-8') + 3 },
  ];
  expect(cssOnlySignature(source, ranges)).toMatch(/^\d+:[a-z0-9]+$/);
  expect(cssOnlySignature(source, ranges)).toBe(cssOnlySignature(changedUtilities, changedRanges));
  expect(cssOnlySignature(source, [])).not.toBe(source);
  expect(cssOnlySignature(source, [])).not.toBe(cssOnlySignature(`${source}!`, []));
});
