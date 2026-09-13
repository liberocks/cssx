import { expect, it } from 'vitest';

import { parseTheme } from './theme';
import { validateUtilityCandidate } from './validate-utility-candidate';

const theme = parseTheme();

it('accepts utilities that compile for the active theme', () => {
  expect(() => validateUtilityCandidate('p-1', theme)).not.toThrow();
  expect(() => validateUtilityCandidate('animate-pulse', theme)).not.toThrow();
});

it('throws for utilities with no compiled CSS', () => {
  expect(() => validateUtilityCandidate('unknown-utility', theme)).toThrow('cannot compile utility');
});