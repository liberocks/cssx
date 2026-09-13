import { expect, it } from 'vitest';

import { themeNamespace } from './theme-namespace';

it('generates compact deterministic namespaces for empty, ASCII, and UTF-16 input', () => {
  expect(themeNamespace('')).toBe('ztntfp-17wdrqx');
  expect(themeNamespace('--color-brand:red')).toBe('jpnlb-1lj2iy3');
  expect(themeNamespace('😀')).toBe('1kdnhdk-d1ty04');
});

it('keeps distinct theme signatures in distinct namespaces', () => {
  expect(themeNamespace('theme-a')).not.toBe(themeNamespace('theme-b'));
});
