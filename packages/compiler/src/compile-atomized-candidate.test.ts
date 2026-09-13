import { expect, it } from 'vitest';

import { parseCandidate } from './candidate';
import { compileAtomizedCandidate } from './compile-atomized-candidate';
import { getUtilityAtoms } from './get-utility-atoms';
import { parseTheme } from './theme';

const theme = parseTheme();

it('renders one ordered rule per declaration atom', () => {
  const result = compileAtomizedCandidate({
    candidateSource: 'border-x-2',
    classNames: ['a', 'b'],
    theme,
    atoms: getUtilityAtoms('border-x-2', theme),
    candidate: parseCandidate('border-x-2'),
    semanticGroup: 'border-x',
    fallbackCss: undefined,
    selectorAliases: {},
    includedClasses: undefined,
    variantOptions: {},
  });

  expect(result.map((entry) => entry.css)).toEqual(['.a{border-left-width:2px;}', '.b{border-right-width:2px;}']);
  expect(result.map((entry) => entry.className)).toEqual(['a', 'b']);
  expect(result[0]?.order).toContain('\u00000');
  expect(result[1]?.order).toContain('\u00001');
});

it('enforces one class per atom and drops excluded selectors', () => {
  const options = {
    candidateSource: 'border-x-2',
    classNames: ['a', 'b'],
    theme,
    atoms: getUtilityAtoms('border-x-2', theme),
    candidate: parseCandidate('border-x-2'),
    semanticGroup: 'border-x',
    fallbackCss: undefined,
    selectorAliases: {},
    includedClasses: new Set(['a']),
    variantOptions: {},
  };
  expect(compileAtomizedCandidate(options)).toHaveLength(1);
  expect(() => compileAtomizedCandidate({ ...options, classNames: ['a'] })).toThrow(
    'expected 2 generated classes for utility "border-x-2"',
  );
});
