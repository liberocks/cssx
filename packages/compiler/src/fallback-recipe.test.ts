import { expect, it } from 'vitest';

import { parseCandidate } from './candidate';
import { fallbackRecipe } from './fallback-recipe';

const candidate = parseCandidate('align-baseline');

it('emits a fallback atom and CSS block when fallback CSS is provided', () => {
  const result = fallbackRecipe('align-baseline', candidate, 'align-baseline', ':root, :host { … }');
  expect(result.recipe.candidate).toBe('align-baseline');
  expect(result.recipe.atoms.map(([atom]) => atom)).toEqual([
    { property: '--cssx-fallback', value: 'initial', semanticGroup: 'align-baseline' },
  ]);
  expect(result.recipe.writes).toEqual([{ group: 'align-baseline', conflicts: ['align-baseline'] }]);
  expect(result.recipe.fallbackCss).toBe(':root, :host { … }');
  expect(result.recipe.resources).toEqual({ keyframes: [], properties: [] });
});

it('emits an empty recipe when no fallback CSS is provided', () => {
  const result = fallbackRecipe('border/50', candidate, 'border', '');
  expect(result.recipe.atoms).toEqual([]);
  expect(result.recipe.writes).toEqual([]);
  expect(result.recipe.fallbackCss).toBeUndefined();
});

it('scopes and tags semantics with the fallback group', () => {
  const result = fallbackRecipe('align-baseline', candidate, 'align-baseline', ':root { … }');
  expect(result.semantics).toEqual({
    scope: '',
    group: 'align-baseline',
    conflicts: ['align-baseline'],
  });
  expect(result.parsedCandidate).toEqual(candidate);
});

it('scopes fallback semantics by variant and importance', () => {
  const scoped = fallbackRecipe('hover:align-baseline', parseCandidate('hover:align-baseline'), 'x', ':root { … }');
  expect(scoped.semantics.scope).toBe('hover');
  const important = fallbackRecipe('align-baseline!', parseCandidate('align-baseline!'), 'x', ':root { … }');
  expect(important.semantics.scope).toBe('!');
});