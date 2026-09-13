import { customStateName } from './custom-state-name';

/**
 * Reads a custom state variant name.
 *
 * @param value Variant name.
 * @returns Custom state name, or null when the prefix does not match.
 */
export function stateVariantName(value: string): string | null {
  return customStateName(value, 'state-');
}
