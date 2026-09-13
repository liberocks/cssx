import type { UtilityDeclaration } from './utility-types';

/**
 * Creates a transition recipe with CSSX's standard timing defaults.
 *
 * @param properties Transition property list.
 * @returns Transition declarations.
 */
export function transitionDeclarations(properties: string): UtilityDeclaration[] {
  return [
    { property: 'transition-property', value: properties },
    { property: 'transition-duration', value: '150ms' },
    { property: 'transition-timing-function', value: 'cubic-bezier(.4, 0, .2, 1)' },
  ];
}
