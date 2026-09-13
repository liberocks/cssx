import { expect, it } from 'vitest';

import { parseCandidate } from './candidate';
import { compileSingleClassCandidate } from './compile-single-class-candidate';
import { getUtilityAtoms } from './get-utility-atoms';
import { parseTheme } from './theme';

const theme = parseTheme();

it('renders one declaration atom under one class', () => {
  const result = compileSingleClassCandidate({
    candidateSource: 'p-1',
    classNames: ['x'],
    theme,
    atoms: getUtilityAtoms('p-1', theme),
    candidate: parseCandidate('p-1'),
    semanticGroup: 'p',
    fallbackCss: undefined,
    selectorAliases: {},
    includedClasses: undefined,
    variantOptions: {},
  });

  expect(result[0]?.css).toBe('.x{padding:calc(0.25rem * 1);}');
});

it('flattens multi-declaration atoms and applies candidate variants', () => {
  const result = compileSingleClassCandidate({
    candidateSource: 'shadow-sm',
    classNames: ['x'],
    theme,
    atoms: getUtilityAtoms('shadow-sm', theme),
    candidate: parseCandidate('hover:p-1'),
    semanticGroup: 'shadow',
    fallbackCss: undefined,
    selectorAliases: {},
    includedClasses: undefined,
    variantOptions: {},
  });

  expect(result).toHaveLength(1);
  expect(result[0]?.css).toContain('@media (hover: hover){.x:hover{');
  expect(result[0]?.css).toContain('box-shadow:var(--cssx-shadow');
});
