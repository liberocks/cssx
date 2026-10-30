import { expect, it } from 'vitest';

import { describeUtilityFormatting } from './describe-utility-formatting';

it('assigns CSSX formatting categories and registered family ranks', () => {
  expect(describeUtilityFormatting('block')?.categoryRank).toBe(0);
  expect(describeUtilityFormatting('items-center')?.categoryRank).toBe(1);
  expect(describeUtilityFormatting('w-full')).toMatchObject({ categoryRank: 2, familyRank: 0 });
  expect(describeUtilityFormatting('max-w-sm')).toMatchObject({ categoryRank: 2, familyRank: 3 });
  expect(describeUtilityFormatting('p-4')?.categoryRank).toBe(3);
  expect(describeUtilityFormatting('text-sm')?.categoryRank).toBe(4);
  expect(describeUtilityFormatting('rounded-xl')?.categoryRank).toBe(5);
  expect(describeUtilityFormatting('bg-white')?.categoryRank).toBe(6);
  expect(describeUtilityFormatting('shadow-md')?.categoryRank).toBe(7);
  expect(describeUtilityFormatting('translate-x-1')?.categoryRank).toBe(8);
  expect(describeUtilityFormatting('cursor-pointer')?.categoryRank).toBe(9);
});

it('exposes normalized variants and conservative write domains', () => {
  expect(describeUtilityFormatting('hover:focus:p-4')).toMatchObject({
    variantScope: 'focus:hover',
    variants: ['focus', 'hover'],
    group: 'p',
    writeDomains: expect.arrayContaining(['p', 'px', 'py']),
  });
});

it('classifies arbitrary properties and rejects unknown or malformed candidates', () => {
  expect(describeUtilityFormatting('[color:red]')).toMatchObject({ categoryRank: 6, group: 'arbitrary..color' });
  expect(describeUtilityFormatting('not-a-cssx-utility')).toBeNull();
  expect(describeUtilityFormatting('p-4:bad:')).toBeNull();
});
