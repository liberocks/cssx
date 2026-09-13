import { resolveArbitraryCssValue } from './utility-resolvers';
import type { UtilityDeclaration } from './utility-types';

/** Feature query used by named scroll timeline producers. */
const SCROLL_TIMELINE_SUPPORT = '@supports (scroll-timeline-name: none)';
/** Feature query used by named view timeline producers. */
const VIEW_TIMELINE_SUPPORT = '@supports (view-timeline-name: none)';
/** Feature query used by timeline scope declarations. */
const TIMELINE_SCOPE_SUPPORT = '@supports (timeline-scope: none)';

/**
 * Compiles named timeline producer and scope utilities.
 *
 * @param utility Utility name without variants.
 * @returns Timeline declaration, or null when unsupported.
 */
export function compileTimelineProducer(utility: string): UtilityDeclaration | null {
  const name = /^(scroll|view)-timeline-name-\[(--[a-z_][a-z0-9_-]*)\]$/i.exec(utility);
  if (name) {
    return {
      property: `${name[1]}-timeline-name`,
      value: name[2]!,
      atRule: name[1] === 'scroll' ? SCROLL_TIMELINE_SUPPORT : VIEW_TIMELINE_SUPPORT,
    };
  }
  const axis = /^(scroll|view)-timeline-axis-(block|inline|x|y)$/.exec(utility);
  if (axis) {
    return {
      property: `${axis[1]}-timeline-axis`,
      value: axis[2]!,
      atRule: axis[1] === 'scroll' ? SCROLL_TIMELINE_SUPPORT : VIEW_TIMELINE_SUPPORT,
    };
  }
  const inset = /^view-timeline-inset-(\[[\s\S]+\])$/.exec(utility);
  if (inset) {
    return {
      property: 'view-timeline-inset',
      value: resolveArbitraryCssValue(inset[1]!),
      atRule: VIEW_TIMELINE_SUPPORT,
    };
  }
  if (utility === 'timeline-scope-all') {
    return { property: 'timeline-scope', value: 'all', atRule: TIMELINE_SCOPE_SUPPORT };
  }
  const scope = /^timeline-scope-\[(--[a-z_][a-z0-9_-]*)\]$/i.exec(utility);
  return scope ? { property: 'timeline-scope', value: scope[1]!, atRule: TIMELINE_SCOPE_SUPPORT } : null;
}
