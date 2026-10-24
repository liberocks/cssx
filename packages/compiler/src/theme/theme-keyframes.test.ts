import { describe, expect, it } from 'vitest';

import { DEFAULT_KEYFRAMES } from './theme-keyframes';

describe('DEFAULT_KEYFRAMES', () => {
  it('includes built-in animation names and matching keyframe rules', () => {
    expect(Object.keys(DEFAULT_KEYFRAMES)).toEqual([
      'spin',
      'ping',
      'pulse',
      'bounce',
      'fade-in',
      'fade-out',
      'slide-in-up',
      'slide-in-down',
      'slide-in-left',
      'slide-in-right',
      'scale-in',
      'scale-out',
      'shimmer',
    ]);

    for (const [name, rule] of Object.entries(DEFAULT_KEYFRAMES)) {
      expect(rule.startsWith(`@keyframes ${name}{`), name).toBe(true);
      expect(rule.endsWith('}'), name).toBe(true);
    }
  });
});
