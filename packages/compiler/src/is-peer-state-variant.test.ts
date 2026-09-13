import { describe, expect, it } from 'vitest';

import { isPeerStateVariant } from './is-peer-state-variant';

describe('isPeerStateVariant', () => {
  it('recognizes supported peer states and rejects malformed candidates', () => {
    expect(isPeerStateVariant('peer-checked')).toBe(true);
    expect(isPeerStateVariant('peer-unknown')).toBe(false);
    expect(isPeerStateVariant('group-hover')).toBe(false);
  });
});
