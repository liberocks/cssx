import { expect, it } from 'vitest';

import { gradientInterpolation } from './gradient-interpolation';

it('formats no modifier, color spaces, and hue interpolation methods', () => {
  expect(gradientInterpolation(undefined)).toBe('');
  expect(gradientInterpolation('')).toBe('');
  expect(gradientInterpolation('oklab')).toBe('in oklab ');
  expect(gradientInterpolation('longer')).toBe('in oklch longer hue ');
  expect(gradientInterpolation('decreasing')).toBe('in oklch decreasing hue ');
});
