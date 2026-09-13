import { expect, it } from 'vitest';

import { parseCandidate } from './candidate';
import { resolveParsedUtilityRecipe } from './resolve-parsed-utility-recipe';
import { classifyParsedCandidate } from './semantics';
import { parseTheme } from './theme';

const theme = parseTheme();

function resolve(source: string) {
  const candidate = parseCandidate(source);
  return resolveParsedUtilityRecipe(source, candidate, classifyParsedCandidate(candidate)!, theme);
}

it('falls back to semantic groups when atoms have no explicit group', () => {
  expect(resolve('p-1').recipe).toMatchObject({
    candidate: 'p-1',
    resources: { keyframes: [], properties: [] },
    writes: [{ group: 'p', conflicts: ['p'] }],
  });
});

it('uses explicit semantic groups and defaults conflicts', () => {
  expect(resolve('shadow-sm').recipe.writes).toEqual([{ group: 'shadow', conflicts: ['shadow'] }]);
});

it('carries explicit semantic conflict channels into writes', () => {
  expect(resolve('normal-nums').recipe.writes).toEqual([
    {
      group: 'numeric-normal',
      conflicts: [
        'numeric-normal',
        'numeric-ordinal',
        'numeric-slashed-zero',
        'numeric-lining-nums',
        'numeric-oldstyle-nums',
        'numeric-proportional-nums',
        'numeric-tabular-nums',
        'numeric-diagonal-fractions',
        'numeric-stacked-fractions',
      ],
    },
  ]);
});

it('builds a data-backed fallback recipe when compilation is rejected', () => {
  const recipe = resolve('align-baseline').recipe;
  expect(recipe.atoms).toEqual([
    [{ property: '--cssx-fallback', value: 'initial', semanticGroup: 'fallback-vertical-align' }],
  ]);
  expect(recipe.fallbackCss).toBe('.align-baseline{vertical-align: baseline;}');
});

it('keeps the empty recipe for data-backed utilities without CSS', () => {
  expect(resolve('border/50').recipe.atoms).toEqual([]);
  expect(resolve('border/50').recipe.writes).toEqual([]);
});

it('rethrows compilation errors without a fallback recipe', () => {
  expect(() => resolve('unknown-utility')).toThrow('cannot compile utility');
});

it('scopes important declarations with a trailing marker', () => {
  const recipe = resolve('bg-red-500!');
  expect(recipe.recipe.atoms[0]?.[0]?.value).toContain(' !important');
  expect(recipe.parsedCandidate.important).toBe(true);
});

it('collects required keyframes and registered properties', () => {
  expect(resolve('animate-pulse').recipe.resources).toEqual({ keyframes: ['pulse'], properties: [] });
  expect(resolve('scrollbar-thumb-red-500').recipe.resources).toEqual({
    keyframes: [],
    properties: ['--cssx-scrollbar-thumb'],
  });
});
