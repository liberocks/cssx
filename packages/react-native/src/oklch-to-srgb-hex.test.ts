import { expect, it } from 'vitest';

import { oklchToSrgbHex } from './oklch-to-srgb-hex';

it('converts supported OKLCH values with whitespace or underscore separators', () => {
  expect(oklchToSrgbHex('oklch(0% 0 0)')).toBe('#000000');
  expect(oklchToSrgbHex('oklch(100%_0_0)')).toBe('#ffffff');
  expect(oklchToSrgbHex('oklch(63.71% 0.237 25.331)')).toMatch(/^#[0-9a-f]{6}$/);
});

it('clips out-of-gamut channels and rejects unsupported value syntax', () => {
  expect(oklchToSrgbHex('oklch(50% 2 200)')).toMatch(/^#[0-9a-f]{6}$/);
  expect(oklchToSrgbHex('oklch(50% 0.2 30 / 50%)')).toBeNull();
  expect(oklchToSrgbHex('color(display-p3 1 0 0)')).toBeNull();
});
