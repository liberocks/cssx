import { describe, expect, it } from 'vitest';

import { isMotionUtilityCandidate } from './is-motion-utility-candidate';

describe('isMotionUtilityCandidate', () => {
  it('claims every motion-specific prefix and leaves unrelated families alone', () => {
    for (const prefix of [
      'transition-',
      'duration-',
      'delay-',
      'ease-',
      'animation-',
      'stagger-',
      'scroll-timeline-',
      'view-timeline-',
      'timeline-scope-',
      'view-transition-',
    ]) {
      expect(isMotionUtilityCandidate(`${prefix}sample`)).toBe(true);
    }
    expect(isMotionUtilityCandidate('opacity-100')).toBe(false);
  });
});
