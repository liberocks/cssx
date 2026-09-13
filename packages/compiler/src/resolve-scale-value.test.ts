import { expect, it } from 'vitest';

import { resolveScaleValue } from './resolve-scale-value';

it('resolves percentage scale values', () => {
  expect(resolveScaleValue('125', false)).toBe('1.25');
  expect(resolveScaleValue('50', true)).toBe('-0.5');
});
