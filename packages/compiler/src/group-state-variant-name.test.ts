import { describe, expect, it } from 'vitest';

import { groupStateVariantName } from './group-state-variant-name';

describe('groupStateVariantName', () => {
  it('extracts a group state name and ignores unrelated variants', () => {
    expect(groupStateVariantName('group-state-[expanded]')).toBe('expanded');
    expect(groupStateVariantName('state-[expanded]')).toBeNull();
  });
});
