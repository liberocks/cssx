import { expect, it } from 'vitest';

import { compareCandidateVariants } from './compare-candidate-variants';

it('compares variant paths using the compiler canonical order', () => {
  expect(compareCandidateVariants([], ['sm'])).toBeLessThan(0);
  expect(compareCandidateVariants(['sm'], ['md'])).toBeLessThan(0);
  expect(compareCandidateVariants(['dark'], ['hover'])).toBeLessThan(0);
  expect(compareCandidateVariants(['focus', 'hover'], ['hover', 'focus'])).toBeLessThan(0);
  expect(compareCandidateVariants(['sm'], ['sm', 'hover'])).toBeLessThan(0);
  expect(compareCandidateVariants(['custom-z'], ['custom-a'])).toBeGreaterThan(0);
  expect(compareCandidateVariants(['md'], ['md'])).toBe(0);
});
