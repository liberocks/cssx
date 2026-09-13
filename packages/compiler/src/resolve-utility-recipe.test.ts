import { expect, it } from 'vitest';

import { resolveUtilityRecipe } from './resolve-utility-recipe';
import { parseTheme } from './theme';

const theme = parseTheme();

it('resolves valid candidates into recipes with parsed and classified data', () => {
  const result = resolveUtilityRecipe('p-1', theme);
  expect(result.recipe.candidate).toBe('p-1');
  expect(result.parsedCandidate.utility).toBe('p-1');
  expect(result.semantics.group).toBe('p');
  expect(result.recipe.writes).toEqual([{ group: 'p', conflicts: ['p'] }]);
});

it('rejects candidates the classifier cannot classify', () => {
  expect(() => resolveUtilityRecipe('unknown-utility', theme)).toThrow(
    'CSSX cannot compile utility "unknown-utility".',
  );
});

it('propagates fallback recipes for data-backed candidates', () => {
  const result = resolveUtilityRecipe('align-baseline', theme);
  expect(result.recipe.fallbackCss).toBe('.align-baseline{vertical-align: baseline;}');
});
