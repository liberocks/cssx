import { describe, expect, it } from 'vitest';

import { isStateVariant } from './is-state-variant';

describe('isStateVariant', () => {
  it('recognizes mapped state and positional variants only', () => {
    expect(isStateVariant('focus-visible')).toBe(true);
    expect(isStateVariant('odd')).toBe(true);
    expect(isStateVariant('unknown')).toBe(false);
  });
});
