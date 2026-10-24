import { isStateVariant } from './is-state-variant';

/**
 * Checks whether a name is a supported group state variant.
 *
 * @param value Variant name.
 * @returns Whether the name is a group state variant.
 */
export function isGroupStateVariant(value: string): boolean {
  return value.startsWith('group-') && isStateVariant(value.slice('group-'.length));
}
