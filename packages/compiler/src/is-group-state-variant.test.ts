import { describe, expect, it } from 'vitest';

import { isGroupStateVariant } from './is-group-state-variant';

describe('isGroupStateVariant', () => {
  it('recognizes supported group states and rejects malformed candidates', () => {
    expect(isGroupStateVariant('group-hover')).toBe(true);
    expect(isGroupStateVariant('group-unknown')).toBe(false);
    expect(isGroupStateVariant('peer-hover')).toBe(false);
  });
});
