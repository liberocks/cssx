import { describe, expect, it } from 'vitest';

// @ts-expect-error The editor extension ships CommonJS without declaration files.
import { colorForCandidate, entries } from '../src/catalog-entries.js';

describe('catalog entries', () => {
  it('returns exact utilities, value families, and variants for matching prefixes', () => {
    expect(entries('animate-')).toEqual(expect.arrayContaining([{ label: 'animate-spin', detail: 'CSSX utility' }]));
    expect(entries('animation-name-')).toEqual(
      expect.arrayContaining([{ label: 'animation-name-', detail: 'Animation name utility family' }]),
    );
    expect(entries('motion-')).toEqual(
      expect.arrayContaining([
        { label: 'motion-safe:', detail: 'CSSX variant' },
        { label: 'motion-reduce:', detail: 'CSSX variant' },
      ]),
    );
    expect(entries('unknown-')).toEqual([]);
  });

  it('offers the compiler-supported spacing, layout, and line-clamp families', () => {
    expect(entries('px-')).toContainEqual({ label: 'px-', detail: 'Horizontal padding utility family' });
    expect(entries('place-content-')).toContainEqual({
      label: 'place-content-',
      detail: 'Place content utility family',
    });
    expect(entries('line-clamp-')).toContainEqual({ label: 'line-clamp-', detail: 'Line clamp utility family' });
    expect(entries('truncate')).toContainEqual({ label: 'truncate', detail: 'CSSX utility' });
  });

  it('suggests concrete text sizes, palette colors, and CSSX theme families', () => {
    expect(entries('text-')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'text-sm' }),
        expect.objectContaining({ label: 'text-lg' }),
        expect.objectContaining({ label: 'text-red-500', colorHex: expect.stringMatching(/^#[\da-f]{6}$/i) }),
      ]),
    );
    expect(entries('duration-')).toEqual(
      expect.arrayContaining([expect.objectContaining({ label: 'duration-normal' })]),
    );
    expect(entries('bg-steel-')).toEqual(
      expect.arrayContaining([expect.objectContaining({ label: 'bg-steel-500', colorHex: expect.any(String) })]),
    );
  });

  it('resolves palette swatches, opacity modifiers, and alpha palette values', () => {
    expect(colorForCandidate('text-red-500')).toMatch(/^#[\da-f]{6}$/i);
    expect(colorForCandidate('text-red-500/50')).toMatch(/^#[\da-f]{6}80$/i);
    expect(colorForCandidate('text-red-500/[0.25]')).toMatch(/^#[\da-f]{6}40$/i);
    expect(colorForCandidate('text-red-500/[var(--opacity)]')).toMatch(/^#[\da-f]{6}$/i);
    expect(colorForCandidate('text-transparent/50')).toBe('#00000000');
    expect(colorForCandidate('border-t-red-500')).toMatch(/^#[\da-f]{6}$/i);
    expect(colorForCandidate('text-unknown')).toBeUndefined();
    expect(colorForCandidate('not-a-color')).toBeUndefined();
  });
});
