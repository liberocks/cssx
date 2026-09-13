import type { UtilityDeclaration } from './utility-types';

/** Feature query used by scroll- and view-timeline declarations. */
const TIMELINE_SUPPORT = '@supports (animation-timeline: scroll())';

/**
 * Compiles animation timeline consumer utilities.
 *
 * @param utility Utility name without variants.
 * @returns Timeline declaration, or null when unsupported.
 */
export function compileAnimationTimeline(utility: string): UtilityDeclaration | null {
  const fixed: Readonly<Record<string, string>> = {
    'animation-timeline-auto': 'auto',
    'animation-timeline-none': 'none',
  };
  if (fixed[utility]) {
    return { property: 'animation-timeline', value: fixed[utility]!, atRule: TIMELINE_SUPPORT };
  }
  const scroll = /^animation-timeline-scroll(?:-(root|self))?-(block|inline|x|y)$/.exec(utility);
  if (scroll) {
    const scroller = scroll[1];
    const value = scroller ? `scroll(${scroller} ${scroll[2]})` : `scroll(${scroll[2]})`;
    return {
      property: 'animation-timeline',
      value,
      atRule: TIMELINE_SUPPORT,
    };
  }
  const view = /^animation-timeline-view-(block|inline|x|y)$/.exec(utility);
  if (view) {
    return { property: 'animation-timeline', value: `view(${view[1]})`, atRule: TIMELINE_SUPPORT };
  }
  const named = /^animation-timeline-\[(--[a-z_][a-z0-9_-]*)\]$/i.exec(utility);
  return named ? { property: 'animation-timeline', value: named[1]!, atRule: TIMELINE_SUPPORT } : null;
}
