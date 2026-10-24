import { expect, it } from 'vitest';

import { compileRadialGradientUtility } from './compile-radial-gradient-utility';

it('resolves optional radial-gradient interpolation modes', () => {
  expect(compileRadialGradientUtility('bg-radial')?.[0]?.value).toContain(
    'radial-gradient(var(--cssx-gradient-via-stops',
  );
  expect(compileRadialGradientUtility('bg-radial/oklab')?.[0]?.value).toContain('radial-gradient(in oklab ');
  expect(compileRadialGradientUtility('bg-radial/longer')?.[0]?.value).toContain('in oklch longer hue');
  expect(compileRadialGradientUtility('bg-radial/invalid')).toBeNull();
});
