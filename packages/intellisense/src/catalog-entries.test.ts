import { describe, expect, it } from 'vitest';

// @ts-expect-error The editor extension ships CommonJS without declaration files.
import { entries } from '../src/catalog-entries.js';

describe('catalog entries', () => {
  it('returns exact utilities, value families, and variants for matching prefixes', () => {
    expect(entries('animate-')).toEqual(expect.arrayContaining([{ label: 'animate-spin', detail: 'CSSX utility' }]));
    expect(entries('animation-name-')).toEqual(
      expect.arrayContaining([{ label: 'animation-name-', detail: 'Animation name utility family' }]),
    );
    expect(entries('motion-')).toEqual([
      { label: 'motion-safe:', detail: 'CSSX variant' },
      { label: 'motion-reduce:', detail: 'CSSX variant' },
    ]);
    expect(entries('unknown-')).toEqual([]);
  });
});
