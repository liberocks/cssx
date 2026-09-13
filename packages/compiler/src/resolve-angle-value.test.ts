import { expect, it } from 'vitest';

import { resolveAngleValue } from './resolve-angle-value';

it('resolves numeric and arbitrary angle values', () => {
  expect(resolveAngleValue('45', false)).toBe('45deg');
  expect(resolveAngleValue('[.5turn]', true)).toBe('-.5turn');
});
