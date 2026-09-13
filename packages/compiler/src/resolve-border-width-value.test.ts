import { expect, it } from 'vitest';
import { resolveBorderWidthValue } from './resolve-border-width-value';

it('resolves named and arbitrary border widths', () => {
  expect(resolveBorderWidthValue('4')).toBe('4px');
  expect(resolveBorderWidthValue('[3rem]')).toBe('3rem');
  expect(resolveBorderWidthValue('5')).toBeNull();
});
