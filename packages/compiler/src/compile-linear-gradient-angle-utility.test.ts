import { expect, it } from 'vitest';

import { compileLinearGradientAngleUtility } from './compile-linear-gradient-angle-utility';

it('resolves positive, negative, arbitrary, and interpolated linear angles', () => {
  expect(compileLinearGradientAngleUtility('bg-linear-45', true)?.[0]?.value).toContain('-45deg');
  expect(compileLinearGradientAngleUtility('bg-linear-[45deg]/srgb', false)?.[0]?.value).toContain('in srgb 45deg');
  expect(compileLinearGradientAngleUtility('bg-linear-invalid', false)).toBeNull();
});
