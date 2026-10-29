import { describe, expect, it } from 'vitest';

import { nextStableCompositeOrdinal } from './next-stable-composite-ordinal';

describe('nextStableCompositeOrdinal', () => {
  it('allocates module-local ordinals in order', () => {
    const state: { stableClassNameOrdinal?: number } = {};

    expect(nextStableCompositeOrdinal(state)).toBe(0);
    expect(nextStableCompositeOrdinal(state)).toBe(1);
    expect(state.stableClassNameOrdinal).toBe(2);
  });
});
