import { compileAnimationLonghandUtility } from './compile-animation-longhand-utility';
import { compileAnimationRange } from './compile-animation-range';
import { compileAnimationTimeline } from './compile-animation-timeline';
import { compileStaggerUtility } from './compile-stagger-utility';
import { compileTimelineProducer } from './compile-timeline-producer';
import { compileTransitionUtility } from './compile-transition-utility';
import { compileViewTransitionUtility } from './compile-view-transition-utility';
import type { CssxTheme } from './theme';
import type { UtilityDeclaration } from './utility-types';

/**
 * Compiles transition, animation, timeline, stagger, and View Transition utilities.
 *
 * @param utility Utility name without variants.
 * @param negative True when the utility is negated.
 * @param theme Active resolved theme.
 * @returns Motion declarations, or null when unsupported.
 */
export function compileMotionUtility(
  utility: string,
  negative: boolean,
  theme: CssxTheme,
): UtilityDeclaration | UtilityDeclaration[] | null {
  const transition = compileTransitionUtility(utility, negative, theme);
  if (transition) {
    return transition;
  }
  const stagger = compileStaggerUtility(utility, negative, theme);
  if (stagger) {
    return stagger;
  }
  const animation = compileAnimationLonghandUtility(utility, negative, theme);
  if (animation) {
    return animation;
  }
  const timeline = compileAnimationTimeline(utility);
  if (timeline) {
    return negative ? null : timeline;
  }
  const producer = compileTimelineProducer(utility);
  if (producer) {
    return negative ? null : producer;
  }
  const range = compileAnimationRange(utility);
  if (range) {
    return negative ? null : range;
  }
  const viewTransition = compileViewTransitionUtility(utility);
  return viewTransition && !negative ? viewTransition : null;
}
