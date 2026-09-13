import { expect, it } from 'vitest';

import { DEFAULT_THEME } from './theme-defaults';

it('provides non-empty custom-property names and values for built-in theme tokens', () => {
  expect(Object.keys(DEFAULT_THEME).length).toBeGreaterThan(500);
  for (const [name, value] of Object.entries(DEFAULT_THEME)) {
    expect(name.startsWith('--'), name).toBe(true);
    expect(value, name).not.toBe('');
  }
});

it('includes documented breakpoint, spacing, typography, and animation defaults', () => {
  expect(DEFAULT_THEME['--spacing']).toBe('0.25rem');
  expect(DEFAULT_THEME['--breakpoint-sm']).toBe('40rem');
  expect(DEFAULT_THEME['--text-3xl']).toBe('1.875rem');
  expect(DEFAULT_THEME['--text-3xl--line-height']).toBe('calc(2.25 / 1.875)');
  expect(DEFAULT_THEME['--color-transparent']).toBe('transparent');
  expect(DEFAULT_THEME['--shadow-md']).toContain('rgb');
  expect(DEFAULT_THEME['--animate-spin']).toBe('spin 1s linear infinite');
});
