import { expect, it } from 'vitest';
import { millisecondsValue } from './milliseconds-value';

it('normalizes duration values', () => {
  expect(millisecondsValue('150')).toBe('150ms');
  expect(millisecondsValue('[.2s]')).toBe('.2s');
});
