import { describe, expect, it } from 'vitest';

import { customStateName } from './custom-state-name';

describe('customStateName', () => {
  it('returns null when the prefix or brackets do not match', () => {
    expect(customStateName('state-active', 'state-')).toBeNull();
    expect(customStateName('group-state-[active]', 'state-')).toBeNull();
  });

  it('extracts valid names and rejects invalid or reserved names', () => {
    expect(customStateName('state-[expanded]', 'state-')).toBe('expanded');
    for (const value of ['state-[.expanded]', 'state-[initial]']) {
      expect(() => customStateName(value, 'state-'), value).toThrow('Invalid CSSX custom state variant');
    }
  });
});
