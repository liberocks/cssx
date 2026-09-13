import { expect, it } from 'vitest';

import { parseCandidate } from './candidate';
import { compileCandidate } from './compile-candidate';
import { getUtilityAtoms } from './get-utility-atoms';
import { parseTheme } from './theme';
import type { UtilityRecipe } from './utility-recipe-types';

const theme = parseTheme();
const recipe = (source: string): Pick<UtilityRecipe, 'atoms'> => ({
  atoms: getUtilityAtoms(source, theme),
});

it('emits one rule for fallback utilities with a single generated class', () => {
  const { atoms } = recipe('align-baseline');
  const result = compileCandidate(
    'align-baseline',
    ['x'],
    theme,
    atoms,
    parseCandidate('align-baseline'),
    'fallback-vertical-align',
    '.align-baseline{vertical-align: baseline;}',
    {},
    undefined,
    {},
  );
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
  expect(() =>
    compileCandidate(
      'align-baseline',
      ['x', 'y'],
      theme,
      recipe('align-baseline').atoms,
      parseCandidate('align-baseline'),
      'g',
      '.x{}',
      {},
      undefined,
      {},
    ),
  ).toThrow('expected one generated class for fallback utility "align-baseline"');
});

it('renders empty fallback CSS when every alias is excluded', () => {
  const { atoms } = recipe('align-baseline');
  const result = compileCandidate(
    'align-baseline',
    ['x'],
    theme,
    atoms,
    parseCandidate('align-baseline'),
    'fallback-vertical-align',
    '.align-baseline{vertical-align: baseline;}',
    { x: [] },
    new Set(['other']),
    {},
  );
  expect(result[0]?.css).toBe('');
});

it('flattens multi-declaration atoms into one rule for a single class', () => {
  const result = compileCandidate(
    'shadow-sm',
    ['x'],
    theme,
    recipe('shadow-sm').atoms,
    parseCandidate('shadow-sm'),
    'shadow',
    undefined,
    {},
    undefined,
    {},
  );
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
  const result = compileCandidate(
    'border-x-2',
    ['a', 'b'],
    theme,
    recipe('border-x-2').atoms,
    parseCandidate('border-x-2'),
    'border-x',
    undefined,
    {},
    undefined,
    {},
  );
  expect(result).toHaveLength(2);
  expect(result.map((entry) => entry.css)).toEqual(['.a{border-left-width:2px;}', '.b{border-right-width:2px;}']);
  expect(result.map((entry) => entry.className)).toEqual(['a', 'b']);
  expect(result[0]?.order).toContain('\u00000');
  expect(result[1]?.order).toContain('\u00001');
});

it('requires one generated class per atom', () => {
  expect(() =>
    compileCandidate(
      'border-x-2',
      ['a', 'b', 'c'],
      theme,
      recipe('border-x-2').atoms,
      parseCandidate('border-x-2'),
      'border-x',
      undefined,
      {},
      undefined,
      {},
    ),
  ).toThrow('expected 2 generated classes for utility "border-x-2"');
});

it('drops atoms whose classes are excluded from the output', () => {
  const result = compileCandidate(
    'border-x-2',
    ['a', 'b'],
    theme,
    recipe('border-x-2').atoms,
    parseCandidate('border-x-2'),
    'border-x',
    undefined,
    {},
    new Set(['a']),
    {},
  );
  expect(result).toHaveLength(1);
  expect(result[0]?.className).toBe('a');
});

it('applies declared variants while composing per-atom rules', () => {
  const result = compileCandidate(
    'p-1',
    ['x'],
    theme,
    recipe('p-1').atoms,
    parseCandidate('hover:p-1'),
    'p',
    undefined,
    {},
    undefined,
    {},
  );
  expect(result[0]?.css).toBe('@media (hover: hover){.x:hover{padding:calc(0.25rem * 1);}}');
});
