import { PSEUDO_CLASS_VARIANTS } from './pseudo-variant-selectors';

/**
 * Checks whether a name is a supported pseudo-class state.
 *
 * @param value Variant name.
 * @returns Whether the name is a supported state.
 */
export function isStateVariant(value: string): boolean {
  return PSEUDO_CLASS_VARIANTS[value] !== undefined;
}
