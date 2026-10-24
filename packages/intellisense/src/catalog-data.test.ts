import { describe, expect, it } from 'vitest';

// @ts-expect-error The editor extension ships CommonJS without declaration files.
import { EXACT, RECIPES, VARIANTS } from '../src/catalog-data.js';

describe('catalog data', () => {
  it('keeps exact entries unique and recipes and variants well-formed', () => {
    expect(EXACT.length).toBeGreaterThan(100);
    expect(new Set(EXACT).size).toBe(EXACT.length);
    expect(new Set(RECIPES.map(([prefix]: [string, string]) => prefix)).size).toBe(RECIPES.length);
    expect(RECIPES).toContainEqual(['animation-name-', 'Animation name']);
    expect(RECIPES.every(([prefix, detail]: [string, string]) => prefix.endsWith('-') && detail.length > 0)).toBe(true);
    expect(VARIANTS).toContain('hover:');
    expect(VARIANTS.every((variant: string) => variant.endsWith(':'))).toBe(true);
  });

  it('documents compiler-supported layout, scroll, and text-flow utility families', () => {
    expect(EXACT).toEqual(
      expect.arrayContaining(['place-content-evenly', 'justify-items-center', 'text-balance', 'truncate']),
    );
    expect(RECIPES).toEqual(
      expect.arrayContaining([
        ['inset-x-', 'Horizontal inset'],
        ['grid-flow-', 'Grid auto-flow'],
        ['basis-', 'Flex basis'],
        ['space-y-', 'Vertical sibling spacing'],
        ['line-clamp-', 'Line clamp'],
        ['scroll-p-', 'Scroll padding'],
        ['px-', 'Horizontal padding'],
        ['justify-', 'Justify content'],
      ]),
    );
  });
});
