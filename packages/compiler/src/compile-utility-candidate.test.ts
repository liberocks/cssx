import { expect, it, vi } from 'vitest';

import { compileUtilityCandidate } from './compile-utility-candidate';
import { parseTheme } from './theme';

const sharedOptions = {
  theme: parseTheme(),
  selectorAliases: {},
  includedClasses: undefined,
  variantOptions: {},
};

it('does not allocate a class for a utility with no CSS atoms', () => {
  const className = vi.fn(() => 'unused');
  const result = compileUtilityCandidate({
    ...sharedOptions,
    candidate: 'border/50',
    className,
    escapeSourceSelectors: false,
  });

  expect(className).not.toHaveBeenCalled();
  expect(result).toEqual({
    className: '',
    compiled: [],
    requiredKeyframes: new Set(),
    requiredProperties: new Set(),
  });
});

it('compiles source selectors and collects the recipe resources', () => {
  const result = compileUtilityCandidate({
    ...sharedOptions,
    candidate: 'animate-pulse',
    className: (candidate) => candidate,
    escapeSourceSelectors: true,
  });

  expect(result.className).toBe('animate-pulse');
  expect(result.compiled[0]?.css).toContain('.animate-pulse');
  expect(result.requiredKeyframes).toEqual(new Set(['pulse']));
});

it('splits generated atom classes when source selectors are not requested', () => {
  const result = compileUtilityCandidate({
    ...sharedOptions,
    candidate: 'size-4',
    className: () => 'width-atom height-atom',
    escapeSourceSelectors: false,
  });

  expect(result.className).toBe('width-atom height-atom');
  expect(result.compiled.map(({ className }) => className)).toEqual(['width-atom', 'height-atom']);
});

it('keeps aliased classes live and skips resources when every class is pruned', () => {
  const aliased = compileUtilityCandidate({
    ...sharedOptions,
    candidate: 'scrollbar-thumb-red-500',
    className: () => 'generated',
    selectorAliases: { generated: ['composite'] },
    includedClasses: new Set(['composite']),
    escapeSourceSelectors: true,
  });
  expect(aliased.compiled.length).toBeGreaterThan(0);
  expect(aliased.requiredProperties).toEqual(new Set(['--cssx-scrollbar-thumb']));

  const pruned = compileUtilityCandidate({
    ...sharedOptions,
    candidate: 'animate-pulse',
    className: () => 'unused',
    includedClasses: new Set(['other']),
    escapeSourceSelectors: true,
  });
  expect(pruned.className).toBe('unused');
  expect(pruned.compiled).toEqual([]);
  expect(pruned.requiredKeyframes.size).toBe(0);
  expect(pruned.requiredProperties.size).toBe(0);
});
