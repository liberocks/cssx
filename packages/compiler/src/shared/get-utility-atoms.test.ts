import { describe, expect, it } from 'vitest';

import { parseTheme } from '../theme/theme';
import { describeUtilityRecipe } from '../utilities/registry/describe-utility-recipe';
import { getUtilityAtoms } from './get-utility-atoms';

const theme = parseTheme();

it('returns declaration groups for a utility candidate', () => {
  expect(getUtilityAtoms('p-1', theme)).toEqual([[{ property: 'padding', value: 'calc(0.25rem * 1)' }]]);
  expect(getUtilityAtoms('hidden', theme)).toEqual([[{ property: 'display', value: 'none' }]]);
});

describe('describeUtilityRecipe', () => {
  it('describes atoms, resources, and writes for one candidate', () => {
    expect(describeUtilityRecipe('animate-pulse', theme)).toMatchObject({
      candidate: 'animate-pulse',
      resources: { keyframes: ['pulse'], properties: [] },
      writes: [{ group: 'animation', conflicts: ['animation'] }],
    });
  });

  it('throws for candidates the classifier cannot classify', () => {
    expect(() => getUtilityAtoms('unknown-utility', theme)).toThrow('cannot compile utility');
    expect(() => describeUtilityRecipe('unknown-utility', theme)).toThrow('cannot compile utility');
  });
});
