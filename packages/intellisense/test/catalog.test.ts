import { describe, expect, it } from 'vitest';
// @ts-expect-error The editor extension ships CommonJS without declaration files.
import { documentation, entries } from '../src/catalog.js';

describe('IntelliSense catalog', () => {
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

  it('documents exact utilities and value families after stripping variants and modifiers', () => {
    expect(documentation('hover:!flex')).toBe('**flex** — CSSX utility.');
    expect(documentation('md:animation-duration-300')).toBe(
      '**animation-duration-300** — Animation duration utility. Values are resolved during compilation.',
    );
    expect(documentation('unknown')).toBeNull();
  });
});
