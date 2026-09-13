import { expect, it } from 'vitest';
import { resolveOpacityModifier } from './resolve-opacity-modifier';

it('normalizes valid opacity modifiers and rejects unsafe values', () => {
  expect(resolveOpacityModifier('50')).toBe('50');
  expect(resolveOpacityModifier('[12.5]')).toBe('12.5');
  expect(resolveOpacityModifier('101')).toBeNull();
  expect(resolveOpacityModifier('calc(50)')).toBeNull();
});
