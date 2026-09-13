import { expect, it } from 'vitest';

import { nativeValue } from './native-values';

it('converts calculations, lengths, numbers, and native-compatible colors', () => {
  expect(nativeValue('calc(0.5rem * 4)', 'padding')).toBe(32);
  expect(nativeValue('-2rem', 'margin')).toBe(-32);
  expect(nativeValue('3px', 'gap')).toBe(3);
  expect(nativeValue('1.5', 'opacity')).toBe(1.5);
  expect(nativeValue('#123456', 'color')).toBe('#123456');
  expect(nativeValue('50%', 'width')).toBe('50%');
  expect(nativeValue('red !important', 'color')).toBe('red');
  expect(nativeValue('oklch(0% 0 0)', 'color')).toBe('#000000');
  expect(nativeValue('system', 'font-family')).toBe('system');
});

it('requires unresolved variables and dynamic colors to resolve at build time', () => {
  expect(() => nativeValue('var(--space)', 'p-[var(--space)]')).toThrow('requires "p-[var(--space)]"');
  expect(() => nativeValue('color-mix(in oklab, red, blue)', 'bg-mix')).toThrow('requires "bg-mix"');
  expect(() => nativeValue('oklch(50% 0.2 30 / 50%)', 'bg-alpha')).toThrow('requires "bg-alpha"');
});
