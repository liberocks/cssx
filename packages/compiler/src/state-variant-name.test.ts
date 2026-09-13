import { describe, expect, it } from 'vitest';

import { stateVariantName } from './state-variant-name';

describe('stateVariantName', () => {
  it('extracts a state name and ignores unrelated variant names', () => {
    expect(stateVariantName('state-[expanded]')).toBe('expanded');
    expect(stateVariantName('group-state-[expanded]')).toBeNull();
  });
});
