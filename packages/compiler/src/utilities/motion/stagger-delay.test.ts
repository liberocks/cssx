import { describe, expect, it } from 'vitest';

import { staggerDelay } from './stagger-delay';

describe('staggerDelay', () => {
  it('returns the runtime-free forward and reverse stagger formula', () => {
    expect(staggerDelay()).toContain('var(--cssx-stagger-index, 0)');
    expect(staggerDelay()).toContain('var(--cssx-stagger-reverse, 0)');
    expect(staggerDelay()).toContain('var(--cssx-stagger, 0ms)');
  });
});
