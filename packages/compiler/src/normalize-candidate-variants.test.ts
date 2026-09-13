import { expect, it } from 'vitest';
import { normalizeCandidateVariants } from './normalize-candidate-variants';

it('orders commutative variants while preserving ordered arbitrary variants', () => {
  expect(normalizeCandidateVariants(['hover', 'sm', 'focus'], 'hover:sm:focus:block')).toEqual([
    'sm',
    'focus',
    'hover',
  ]);
  expect(normalizeCandidateVariants(['group-hover', 'sm'], 'group-hover:sm:block')).toEqual(['group-hover', 'sm']);
  expect(() => normalizeCandidateVariants(['hover;display:block'], 'hover;display:block:block')).toThrow(
    'Invalid utility',
  );
});
