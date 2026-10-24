import { describe, expect, it } from 'vitest';

import { normalizeArbitraryAtRule } from './normalize-arbitrary-at-rule';

describe('normalizeArbitraryAtRule', () => {
  it('normalizes media and supports conditions', () => {
    expect(normalizeArbitraryAtRule('@media  (width >= 40rem) ')).toBe('@media (width >= 40rem)');
    expect(normalizeArbitraryAtRule('@supports (display:grid)')).toBe('@supports (display:grid)');
  });

  it('rejects missing kinds and empty conditions', () => {
    for (const value of ['@container (width > 20rem)', '@supports', '@media   ']) {
      expect(() => normalizeArbitraryAtRule(value), value).toThrow('Invalid CSSX arbitrary at-rule variant');
    }
  });
});
