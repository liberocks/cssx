import { describe, expect, it } from 'vitest';

import { peerStateVariantName } from './peer-state-variant-name';

describe('peerStateVariantName', () => {
  it('extracts a peer state name and ignores unrelated variants', () => {
    expect(peerStateVariantName('peer-state-[expanded]')).toBe('expanded');
    expect(peerStateVariantName('group-state-[expanded]')).toBeNull();
  });
});
