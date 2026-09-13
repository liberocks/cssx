import { describe, expect, it } from 'vitest';

// @ts-expect-error The editor extension ships CommonJS without declaration files.
import { EXACT, RECIPES, VARIANTS } from '../src/catalog-data.js';

describe('catalog data', () => {
  it('keeps exact entries unique and recipes and variants well-formed', () => {
    expect(EXACT.length).toBeGreaterThan(100);
    expect(new Set(EXACT).size).toBe(EXACT.length);
    expect(RECIPES).toContainEqual(['animation-name-', 'Animation name']);
    expect(RECIPES.every(([prefix, detail]: [string, string]) => prefix.endsWith('-') && detail.length > 0)).toBe(true);
    expect(VARIANTS).toContain('hover:');
    expect(VARIANTS.every((variant: string) => variant.endsWith(':'))).toBe(true);
  });
});
