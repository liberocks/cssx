import { arbitraryValue } from './arbitrary-value';
import { compileAnimationRange } from './compile-animation-range';
import { compileAnimationTimeline } from './compile-animation-timeline';
import { compileTimelineProducer } from './compile-timeline-producer';
import { compileViewTransitionUtility } from './compile-view-transition-utility';
import { negateCssValue } from './negate-css-value';
import { resolveEasing } from './resolve-easing';
import { resolveTime } from './resolve-time';
import { staggerDelay } from './stagger-delay';
import type { CssxTheme } from './theme';
import { transitionDeclarations } from './transition-declarations';
import { resolveArbitraryCssValue } from './utility-resolvers';
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
  const transitionProperties: Readonly<Record<string, string>> = {
    'transition-transform-opacity': 'transform, translate, scale, rotate, opacity',
    'transition-filter': 'filter, -webkit-backdrop-filter, backdrop-filter',
    'transition-size': 'width, height, inline-size, block-size',
  };
  const transitionProperty = transitionProperties[utility];
  if (transitionProperty) {
    return transitionDeclarations(transitionProperty);
  }
  const arbitraryTransition = /^transition-(\[[\s\S]+\])$/.exec(utility);
  if (arbitraryTransition) {
    return transitionDeclarations(resolveArbitraryCssValue(arbitraryTransition[1]!));
  }

  if (utility === 'delay-stagger') {
    return !negative ? { property: 'transition-delay', value: staggerDelay() } : null;
  }
  const transitionTime = /^(duration|delay)-(.+)$/.exec(utility);
  if (transitionTime) {
    const kind = transitionTime[1]!;
    if (negative && kind === 'duration') {
      return null;
    }
    const value = resolveTime(transitionTime[2]!, `--${kind}-`, theme);
    return value ? { property: `transition-${kind}`, value: negative ? negateCssValue(value) : value } : null;
  }
  const transitionEase = /^ease-(.+)$/.exec(utility);
  if (transitionEase) {
    const value = resolveEasing(transitionEase[1]!, theme);
    return !negative && value ? { property: 'transition-timing-function', value } : null;
  }

  const animationName = /^animation-name-(.+)$/.exec(utility);
  if (animationName) {
    const raw = animationName[1]!;
    if (negative) {
      return null;
    }
    if (raw === 'none') {
      return { property: 'animation-name', value: 'none' };
    }
    if (raw.startsWith('[') && raw.endsWith(']')) {
      return { property: 'animation-name', value: resolveArbitraryCssValue(raw) };
    }
    return theme.keyframes[raw] ? { property: 'animation-name', value: raw } : null;
  }

  if (utility === 'animation-delay-stagger') {
    return !negative ? { property: 'animation-delay', value: staggerDelay() } : null;
  }
  const animationTime = /^animation-(duration|delay)-(.+)$/.exec(utility);
  if (animationTime) {
    const kind = animationTime[1]!;
    const raw = animationTime[2]!;
    if (kind === 'duration' && raw === 'auto' && !negative) {
      return { property: 'animation-duration', value: 'auto' };
    }
    if (negative && kind === 'duration') {
      return null;
    }
    const value = resolveTime(raw, `--animation-${kind}-`, theme);
    return value ? { property: `animation-${kind}`, value: negative ? negateCssValue(value) : value } : null;
  }
  const animationEase = /^animation-ease-(.+)$/.exec(utility);
  if (animationEase) {
    const value = resolveEasing(animationEase[1]!, theme, true);
    return !negative && value ? { property: 'animation-timing-function', value } : null;
  }
  const iterations = /^animation-iterations-(.+)$/.exec(utility);
  if (iterations) {
    const raw = iterations[1]!;
    const value = raw === 'infinite' || /^\d+(?:\.\d+)?$/.test(raw) ? raw : arbitraryValue(raw);
    return !negative && value ? { property: 'animation-iteration-count', value } : null;
  }
  const direction = /^animation-direction-(normal|reverse|alternate|alternate-reverse)$/.exec(utility);
  if (direction) {
    return !negative ? { property: 'animation-direction', value: direction[1]! } : null;
  }
  const fill = /^animation-fill-(none|forwards|backwards|both)$/.exec(utility);
  if (fill) {
    return !negative ? { property: 'animation-fill-mode', value: fill[1]! } : null;
  }
  const playState = /^animation-(running|paused)$/.exec(utility);
  if (playState) {
    return !negative ? { property: 'animation-play-state', value: playState[1]! } : null;
  }
  const composition = /^animation-composition-(replace|add|accumulate)$/.exec(utility);
  if (composition) {
    return !negative ? { property: 'animation-composition', value: composition[1]! } : null;
  }

  const stagger = /^stagger-(?!index-|count-)(.+)$/.exec(utility);
  if (stagger) {
    const raw = stagger[1]!;
    if (raw === 'reverse') {
      return !negative ? { property: '--cssx-stagger-reverse', value: '1' } : null;
    }
    const value = resolveTime(raw, '--stagger-', theme);
    return !negative && value ? { property: '--cssx-stagger', value } : null;
  }
  const staggerInteger = /^stagger-(index|count)-(\d+|\[\d+\])$/.exec(utility);
  if (staggerInteger) {
    const value = staggerInteger[2]!.replaceAll(/\[|\]/g, '');
    return !negative ? { property: `--cssx-stagger-${staggerInteger[1]}`, value } : null;
  }
  const timeline = compileAnimationTimeline(utility);
  if (timeline) {
    return !negative ? timeline : null;
  }
  const timelineProducer = compileTimelineProducer(utility);
  if (timelineProducer) {
    return !negative ? timelineProducer : null;
  }
  const range = compileAnimationRange(utility);
  if (range) {
    return !negative ? range : null;
  }

  const viewTransition = compileViewTransitionUtility(utility);
  return viewTransition && !negative ? viewTransition : null;
}
