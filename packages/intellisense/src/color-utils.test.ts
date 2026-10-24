import { describe, expect, it } from 'vitest';

// @ts-expect-error The editor extension ships CommonJS without declaration files.
import { CATALOG } from './catalog-entries.js';
// @ts-expect-error The editor extension ships CommonJS without declaration files.
import { hexToRgba, normalizeHex, parseColorCandidate } from './color-utils.js';

describe('CSSX color utilities', () => {
  it('resolves palette and arbitrary colors with variants, importance, and opacity', () => {
    expect(parseColorCandidate('bg-red-500')).toMatchObject({ prefix: 'bg-', variant: '', hex: '#fb2c36' });
    expect(parseColorCandidate('hover:!-border-t-red-500/50')).toMatchObject({
      prefix: 'hover:!-border-t-',
      variant: 'hover:',
      hex: expect.stringMatching(/^#[\da-f]{6}80$/i),
    });
    expect(parseColorCandidate('bg-red-500/[0.25]')?.hex).toMatch(/^#[\da-f]{6}40$/i);
    expect(parseColorCandidate('bg-red-500/[25%]')?.hex).toMatch(/^#[\da-f]{6}40$/i);
    expect(parseColorCandidate('bg-red-500/0.5')?.hex).toMatch(/^#[\da-f]{6}80$/i);
    expect(parseColorCandidate('bg-red-500/[150%]')?.hex).toBe('#fb2c36');
    expect(parseColorCandidate('bg-red-500/[var(--alpha)]')?.hex).toBe('#fb2c36');
    expect(parseColorCandidate('bg-[#abc]')?.hex).toBe('#aabbcc');
    expect(parseColorCandidate('bg-[#abcd]')?.hex).toBe('#aabbccdd');
    expect(parseColorCandidate('bg-[#11223344]')?.hex).toBe('#11223344');
    expect(parseColorCandidate('bg-red-500/50')?.hex).toMatch(/^#[\da-f]{6}80$/i);
  });

  it('returns no color for non-color utilities, unknown colors, and malformed hex values', () => {
    expect(parseColorCandidate('flex')).toBeUndefined();
    expect(parseColorCandidate('bg-unknown-color')).toBeUndefined();
    expect(parseColorCandidate('bg-[not-a-color]')).toBeUndefined();
    expect(normalizeHex('not-hex')).toBeUndefined();
    expect(hexToRgba('not-hex')).toBeUndefined();
  });

  it('normalizes shorthand and full CSS hex values into RGBA channels', () => {
    expect(normalizeHex('#AbC')).toBe('#aabbcc');
    expect(normalizeHex('#AbCd')).toBe('#aabbccdd');
    expect(normalizeHex('#AABBCC')).toBe('#aabbcc');
    expect(normalizeHex('#AABBCCDD')).toBe('#aabbccdd');
    expect(hexToRgba('#fff')).toEqual([1, 1, 1, 1]);
    expect(hexToRgba('#1234')?.[3]).toBeCloseTo(0x44 / 255);
    expect(hexToRgba('#11223344')?.[3]).toBeCloseTo(0x44 / 255);
  });

  it('ignores an invalid palette hex defensively', () => {
    CATALOG.colors['invalid-test-color'] = 'not-hex';
    try {
      expect(parseColorCandidate('bg-invalid-test-color')).toBeUndefined();
    } finally {
      delete CATALOG.colors['invalid-test-color'];
    }
  });
});
