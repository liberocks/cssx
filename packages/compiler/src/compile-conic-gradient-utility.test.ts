import { expect, it } from 'vitest';

import { compileConicGradientUtility } from './compile-conic-gradient-utility';

it('resolves default, numeric, and arbitrary conic start angles', () => {
  expect(compileConicGradientUtility('bg-conic', false)?.[0]?.value).toContain('from 0deg');
  expect(compileConicGradientUtility('bg-conic-30', true)?.[0]?.value).toContain('from -30deg');
  expect(compileConicGradientUtility('bg-conic-[30deg]/oklab', false)?.[0]?.value).toContain('from 30deg in oklab');
  expect(compileConicGradientUtility('bg-conic-invalid', false)).toBeNull();
});
