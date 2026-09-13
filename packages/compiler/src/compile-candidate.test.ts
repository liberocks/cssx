import { expect, it } from 'vitest';

import { parseCandidate } from './candidate';
import type { ParsedCandidate } from './candidate';
import { compileCandidate } from './compile-candidate';
import { getUtilityAtoms } from './get-utility-atoms';
import { parseTheme } from './theme';
import type { UtilityRecipe } from './utility-recipe-types';
import type { UtilityDeclaration } from './utility-types';

const theme = parseTheme();
const recipe = (source: string): Pick<UtilityRecipe, 'atoms'> => ({ atoms: getUtilityAtoms(source, theme) });

interface CandidateOverrides {
  readonly atoms?: readonly (readonly UtilityDeclaration[])[];
  readonly candidate?: ParsedCandidate;
  readonly fallbackCss?: string;
  readonly selectorAliases?: Readonly<Record<string, readonly string[]>>;
  readonly includedClasses?: ReadonlySet<string>;
}

function compile(
  candidateSource: string,
  classNames: readonly string[],
  semanticGroup: string,
  overrides: CandidateOverrides = {},
) {
  return compileCandidate({
    candidateSource,
    classNames,
    theme,
    atoms: overrides.atoms ?? recipe(candidateSource).atoms,
    candidate: overrides.candidate ?? parseCandidate(candidateSource),
    semanticGroup,
    fallbackCss: overrides.fallbackCss,
    selectorAliases: overrides.selectorAliases ?? {},
    includedClasses: overrides.includedClasses,
    variantOptions: {},
  });
}

it('emits one rule for fallback utilities with a single generated class', () => {
  const result = compile('align-baseline', ['x'], 'fallback-vertical-align', {
    fallbackCss: '.align-baseline{vertical-align: baseline;}',
  });
  expect(result).toEqual([
    {
      candidate: 'align-baseline',
      className: 'x',
      css: '.x{vertical-align: baseline;}',
      order: expect.stringContaining('fallback-vertical-align') as unknown as string,
    },
  ]);
});

it('requires exactly one class for fallback utilities', () => {
  expect(() => compile('align-baseline', ['x', 'y'], 'g', { fallbackCss: '.align-baseline{}' })).toThrow(
    'expected one generated class for fallback utility "align-baseline"',
  );
});

it('renders empty fallback CSS when every alias is excluded', () => {
  const result = compile('align-baseline', ['x'], 'fallback-vertical-align', {
    fallbackCss: '.align-baseline{vertical-align: baseline;}',
    selectorAliases: { x: [] },
    includedClasses: new Set(['other']),
  });
  expect(result[0]?.css).toBe('');
});

it('flattens multi-declaration atoms into one rule for a single class', () => {
  const result = compile('shadow-sm', ['x'], 'shadow');
  expect(result).toEqual([
    {
      candidate: 'shadow-sm',
      className: 'x',
      css: '.x{--cssx-shadow:0 1px 2px 0 rgb(0 0 0 / .05);box-shadow:var(--cssx-shadow, 0 0 #0000), var(--cssx-ring-offset-shadow, 0 0 #0000), var(--cssx-ring-shadow, 0 0 #0000);}',
      order: expect.any(String) as unknown as string,
    },
  ]);
});

it('outputs one rule per atom with an atom index in the order key', () => {
  const result = compile('border-x-2', ['a', 'b'], 'border-x');
  expect(result).toHaveLength(2);
  expect(result.map((entry) => entry.css)).toEqual(['.a{border-left-width:2px;}', '.b{border-right-width:2px;}']);
  expect(result.map((entry) => entry.className)).toEqual(['a', 'b']);
  expect(result[0]?.order).toContain('\u00000');
  expect(result[1]?.order).toContain('\u00001');
});

it('requires one generated class per atom', () => {
  expect(() => compile('border-x-2', ['a', 'b', 'c'], 'border-x')).toThrow(
    'expected 2 generated classes for utility "border-x-2"',
  );
});

it('drops atoms whose classes are excluded from the output', () => {
  const result = compile('border-x-2', ['a', 'b'], 'border-x', { includedClasses: new Set(['a']) });
  expect(result).toHaveLength(1);
  expect(result[0]?.className).toBe('a');
});

it('applies declared variants while composing single-class rules', () => {
  const result = compile('p-1', ['x'], 'p', { candidate: parseCandidate('hover:p-1') });
  expect(result[0]?.css).toBe('@media (hover: hover){.x:hover{padding:calc(0.25rem * 1);}}');
});
