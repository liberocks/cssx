import { expect, it } from 'vitest';
import { flexValue } from './flex-value';

it('resolves integer and fractional flex values', () => {
  expect(flexValue('1')).toBe('1');
  expect(flexValue('1/3')).toBe('calc(1 / 3 * 100%)');
  expect(flexValue('1/0')).toBeNull();
});
