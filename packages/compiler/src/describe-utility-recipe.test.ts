import { expect, it } from 'vitest';

import { describeUtilityRecipe } from './describe-utility-recipe';
import { parseTheme } from './theme';

it('describes a recipe resolved with the active theme', () => {
  const theme = parseTheme('@theme { --spacing: 2px; }');

  expect(describeUtilityRecipe('p-2', theme)).toMatchObject({
    candidate: 'p-2',
    writes: [{ group: 'p', conflicts: ['p'] }],
    atoms: [[{ property: 'padding', value: 'calc(2px * 2)' }]],
  });
});

it('preserves resolver errors for unrecognized utility candidates', () => {
  expect(() => describeUtilityRecipe('unknown-utility', parseTheme())).toThrow('cannot compile utility');
});
