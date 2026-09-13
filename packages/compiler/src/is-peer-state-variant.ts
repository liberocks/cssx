import { isStateVariant } from './is-state-variant';

/**
 * Checks whether a name is a supported peer state variant.
 *
 * @param value Variant name.
 * @returns Whether the name is a peer state variant.
 */
export function isPeerStateVariant(value: string): boolean {
  return value.startsWith('peer-') && isStateVariant(value.slice('peer-'.length));
}
