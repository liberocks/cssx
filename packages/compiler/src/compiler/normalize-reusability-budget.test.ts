import { expect, it } from 'vitest';

import { normalizeReusabilityBudget } from './normalize-reusability-budget';

it('normalizes undefined and auto budgets to auto', () => {
  expect(normalizeReusabilityBudget(undefined)).toBe('auto');
  expect(normalizeReusabilityBudget('auto')).toBe('auto');
});

it('returns a valid bounded numeric budget unchanged', () => {
  expect(normalizeReusabilityBudget(0)).toBe(0);
  expect(normalizeReusabilityBudget(50)).toBe(50);
  expect(normalizeReusabilityBudget(100)).toBe(100);
});

it('rejects non-finite budgets', () => {
  expect(() => normalizeReusabilityBudget(Number.NaN)).toThrow('reusabilityBudget');
  expect(() => normalizeReusabilityBudget(Number.POSITIVE_INFINITY)).toThrow('reusabilityBudget');
});

it('rejects budgets outside the 0 through 100 range', () => {
  expect(() => normalizeReusabilityBudget(-1)).toThrow('reusabilityBudget');
  expect(() => normalizeReusabilityBudget(101)).toThrow('reusabilityBudget');
});
