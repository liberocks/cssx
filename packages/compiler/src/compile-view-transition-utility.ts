import { isCustomIdentifier } from './is-custom-identifier';
import { resolveArbitraryCssValue } from './utility-resolvers';
import type { UtilityDeclaration } from './utility-types';

/** Feature query used by View Transition name declarations. */
const VIEW_TRANSITION_NAME_SUPPORT = '@supports (view-transition-name: none)';
/** Feature query used by View Transition class declarations. */
const VIEW_TRANSITION_CLASS_SUPPORT = '@supports (view-transition-class: none)';

/**
 * Compiles validated View Transition name and class utilities.
 *
 * @param utility Utility name without variants.
 * @returns View Transition declaration, or null when unsupported.
 */
export function compileViewTransitionUtility(utility: string): UtilityDeclaration | null {
  if (utility === 'view-transition-name-none') {
    return { property: 'view-transition-name', value: 'none', atRule: VIEW_TRANSITION_NAME_SUPPORT };
  }
  if (utility === 'view-transition-name-match') {
    return {
      property: 'view-transition-name',
      value: 'match-element',
      atRule: '@supports (view-transition-name: match-element)',
    };
  }
  const name = /^view-transition-name-\[([^\]]+)\]$/.exec(utility);
  if (name && isCustomIdentifier(name[1]!, ['auto', 'match-element', 'none'])) {
    return { property: 'view-transition-name', value: name[1]!, atRule: VIEW_TRANSITION_NAME_SUPPORT };
  }
  if (utility === 'view-transition-class-none') {
    return { property: 'view-transition-class', value: 'none', atRule: VIEW_TRANSITION_CLASS_SUPPORT };
  }
  const classNames = /^view-transition-class-\[([^\]]+)\]$/.exec(utility);
  if (classNames) {
    const value = resolveArbitraryCssValue(`[${classNames[1]!}]`);
    if (value.split(/\s+/).every((part) => isCustomIdentifier(part, ['none']))) {
      return { property: 'view-transition-class', value, atRule: VIEW_TRANSITION_CLASS_SUPPORT };
    }
  }
  return null;
}
