import { expect, it } from 'vitest';

import { PREFIX_GROUPS } from './semantics-prefix-groups';

it('places every strictly longer prefix before its matching parent prefix', () => {
  for (let leftIndex = 0; leftIndex < PREFIX_GROUPS.length; leftIndex++) {
    const [leftPrefix] = PREFIX_GROUPS[leftIndex]!;
    for (let rightIndex = leftIndex + 1; rightIndex < PREFIX_GROUPS.length; rightIndex++) {
      const [rightPrefix] = PREFIX_GROUPS[rightIndex]!;
      if (leftPrefix.length > rightPrefix.length && leftPrefix.startsWith(rightPrefix)) {
        expect(leftIndex, `${leftPrefix} must precede ${rightPrefix}`).toBeLessThan(rightIndex);
      }
    }
  }
});

it('maps representative utility families to their semantic write groups', () => {
  expect(PREFIX_GROUPS).toContainEqual(['bg-linear-to-', 'background-image']);
  expect(PREFIX_GROUPS).toContainEqual(['inset-bs-', 'inset-block-start']);
  expect(PREFIX_GROUPS).toContainEqual(['border-be-', 'border-block-end']);
  expect(PREFIX_GROUPS).toContainEqual(['scroll-pbs-', 'scroll-padding-block-start']);
  expect(PREFIX_GROUPS).toContainEqual(['view-transition-class-', 'view-transition-class']);
});
