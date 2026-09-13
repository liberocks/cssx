import type { ReusabilityBudget } from './reusability';

/**
 * Validates a user-supplied reusability coverage budget.
 *
 * @param budget Reusability budget supplied by the caller.
 * @returns The normalized numeric budget or `'auto'`.
 */
export function normalizeReusabilityBudget(budget: ReusabilityBudget | undefined): number | 'auto' {
  if (budget === undefined || budget === 'auto') {
    return 'auto';
  }
  if (!Number.isFinite(budget) || budget < 0 || budget > 100) {
    throw new Error('CSSX reusabilityBudget must be "auto" or a number from 0 through 100.');
  }
  return budget;
}
