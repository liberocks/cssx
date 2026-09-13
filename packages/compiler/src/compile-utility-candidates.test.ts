import { expect, it } from 'vitest';

import { compileUtilityCandidates } from './compile-utility-candidates';
import { parseTheme } from './theme';

it('compiles unique candidates and records no-output utilities as empty classes', () => {
  const result = compileUtilityCandidates({
    candidates: ['p-1', 'p-1', 'border/50'],
    className: (candidate) => `x-${candidate}`,
    theme: parseTheme(),
    selectorAliases: {},
    includedClasses: undefined,
    variantOptions: {},
    escapeSourceSelectors: false,
  });

  expect(result.classes).toEqual({ 'p-1': 'x-p-1', 'border/50': '' });
  expect(result.compiled).toHaveLength(1);
  expect(result.compiled[0]?.css).toBe('.x-p-1{padding:calc(0.25rem * 1);}');
});

it('retains candidates through aliases and collects recipe resources', () => {
  const result = compileUtilityCandidates({
    candidates: ['animate-pulse', 'scrollbar-thumb-red-500'],
    className: () => 'generated',
    theme: parseTheme(),
    selectorAliases: { generated: ['alias'] },
    includedClasses: new Set(['alias']),
    variantOptions: {},
    escapeSourceSelectors: true,
  });

  expect(result.compiled.length).toBeGreaterThan(0);
  expect(result.requiredKeyframes.has('pulse')).toBe(true);
  expect(result.requiredProperties.has('--cssx-scrollbar-thumb')).toBe(true);
});

it('skips candidates without live generated classes', () => {
  const result = compileUtilityCandidates({
    candidates: ['hidden'],
    className: () => 'generated',
    theme: parseTheme(),
    selectorAliases: {},
    includedClasses: new Set(['other']),
    variantOptions: {},
    escapeSourceSelectors: false,
  });

  expect(result.classes).toEqual({ hidden: 'generated' });
  expect(result.compiled).toEqual([]);
  expect(result.requiredKeyframes.size).toBe(0);
  expect(result.requiredProperties.size).toBe(0);
});
