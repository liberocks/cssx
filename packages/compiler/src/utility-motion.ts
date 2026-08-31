import { resolveThemeToken } from './theme';
import type { CssxTheme } from './theme';
import { resolveArbitraryCssValue } from './utility-resolvers';
import type { UtilityDeclaration } from './utility-types';

/** Built-in timing functions shared by transitions and animations. */
const EASINGS: Readonly<Record<string, string>> = {
  linear: 'linear',
  in: 'cubic-bezier(.4, 0, 1, 1)',
  out: 'cubic-bezier(0, 0, .2, 1)',
  'in-out': 'cubic-bezier(.4, 0, .2, 1)',
};

/** Feature query used by scroll- and view-timeline declarations. */
const TIMELINE_SUPPORT = '@supports (animation-timeline: scroll())';
/** Feature query used by named scroll timeline producers. */
const SCROLL_TIMELINE_SUPPORT = '@supports (scroll-timeline-name: none)';
/** Feature query used by named view timeline producers. */
const VIEW_TIMELINE_SUPPORT = '@supports (view-timeline-name: none)';
/** Feature query used by timeline scope declarations. */
const TIMELINE_SCOPE_SUPPORT = '@supports (timeline-scope: none)';
/** Feature query used by animation range declarations. */
const RANGE_SUPPORT = '@supports (animation-range: normal)';
/** Feature query used by View Transition name declarations. */
const VIEW_TRANSITION_NAME_SUPPORT = '@supports (view-transition-name: none)';
/** Feature query used by View Transition class declarations. */
const VIEW_TRANSITION_CLASS_SUPPORT = '@supports (view-transition-class: none)';

/** Prefixes exclusively owned by the motion resolver. */
const MOTION_PREFIXES = [
  'transition-',
  'duration-',
  'delay-',
  'ease-',
  'animation-',
  'stagger-',
  'scroll-timeline-',
  'view-timeline-',
  'timeline-scope-',
  'view-transition-',
] as const;

/** Checks whether a candidate must not fall through to legacy utility resolvers. */
export function isMotionUtilityCandidate(utility: string): boolean {
  return MOTION_PREFIXES.some((prefix) => utility.startsWith(prefix));
}

/** Compiles transition, animation, timeline, stagger, and View Transition utilities. */
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
    return transitionDeclarations(resolveArbitraryCssValue(arbitraryTransition[1] ?? ''));
  }

  if (utility === 'delay-stagger') {
    return !negative ? { property: 'transition-delay', value: staggerDelay() } : null;
  }
  const transitionTime = /^(duration|delay)-(.+)$/.exec(utility);
  if (transitionTime) {
    const kind = transitionTime[1] ?? '';
    if (negative && kind === 'duration') {
      return null;
    }
    const value = resolveTime(transitionTime[2] ?? '', `--${kind}-`, theme);
    return value ? { property: `transition-${kind}`, value: negative ? negateCssValue(value) : value } : null;
  }
  const transitionEase = /^ease-(.+)$/.exec(utility);
  if (transitionEase) {
    const value = resolveEasing(transitionEase[1] ?? '', theme);
    return !negative && value ? { property: 'transition-timing-function', value } : null;
  }

  const animationName = /^animation-name-(.+)$/.exec(utility);
  if (animationName) {
    const raw = animationName[1] ?? '';
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
    const kind = animationTime[1] ?? '';
    const raw = animationTime[2] ?? '';
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
    const value = resolveEasing(animationEase[1] ?? '', theme, true);
    return !negative && value ? { property: 'animation-timing-function', value } : null;
  }
  const iterations = /^animation-iterations-(.+)$/.exec(utility);
  if (iterations) {
    const raw = iterations[1] ?? '';
    const value = raw === 'infinite' || /^\d+(?:\.\d+)?$/.test(raw) ? raw : arbitraryValue(raw);
    return !negative && value ? { property: 'animation-iteration-count', value } : null;
  }
  const direction = /^animation-direction-(normal|reverse|alternate|alternate-reverse)$/.exec(utility);
  if (direction) {
    return !negative ? { property: 'animation-direction', value: direction[1] ?? '' } : null;
  }
  const fill = /^animation-fill-(none|forwards|backwards|both)$/.exec(utility);
  if (fill) {
    return !negative ? { property: 'animation-fill-mode', value: fill[1] ?? '' } : null;
  }
  const playState = /^animation-(running|paused)$/.exec(utility);
  if (playState) {
    return !negative ? { property: 'animation-play-state', value: playState[1] ?? '' } : null;
  }
  const composition = /^animation-composition-(replace|add|accumulate)$/.exec(utility);
  if (composition) {
    return !negative ? { property: 'animation-composition', value: composition[1] ?? '' } : null;
  }

  const stagger = /^stagger-(?!index-|count-)(.+)$/.exec(utility);
  if (stagger) {
    const raw = stagger[1] ?? '';
    if (raw === 'reverse') {
      return !negative ? { property: '--cssx-stagger-reverse', value: '1' } : null;
    }
    const value = resolveTime(raw, '--stagger-', theme);
    return !negative && value ? { property: '--cssx-stagger', value } : null;
  }
  const staggerInteger = /^stagger-(index|count)-(\d+|\[\d+\])$/.exec(utility);
  if (staggerInteger) {
    const value = (staggerInteger[2] ?? '').replaceAll(/\[|\]/g, '');
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

/** Creates a transition recipe with CSSX's standard timing defaults. */
function transitionDeclarations(properties: string): UtilityDeclaration[] {
  return [
    { property: 'transition-property', value: properties },
    { property: 'transition-duration', value: '150ms' },
    { property: 'transition-timing-function', value: 'cubic-bezier(.4, 0, .2, 1)' },
  ];
}

/** Resolves a numeric, arbitrary, variable, or theme-backed time value. */
function resolveTime(raw: string, tokenPrefix: string, theme: CssxTheme): string | null {
  if (/^\d+(?:\.\d+)?$/.test(raw)) {
    return `${raw}ms`;
  }
  const arbitrary = arbitraryValue(raw);
  return arbitrary ?? resolveThemeToken(theme, `${tokenPrefix}${raw}`) ?? null;
}

/** Resolves a built-in, arbitrary, or theme-backed easing value. */
function resolveEasing(raw: string, theme: CssxTheme, animation = false): string | null {
  const arbitrary = arbitraryValue(raw);
  return (
    EASINGS[raw] ??
    arbitrary ??
    resolveThemeToken(theme, `--ease-${raw}`) ??
    (animation ? resolveThemeToken(theme, `--animation-ease-${raw}`) : undefined) ??
    null
  );
}

/** Resolves bracketed and custom-property shorthand values. */
function arbitraryValue(raw: string): string | null {
  return (raw.startsWith('[') && raw.endsWith(']')) || (raw.startsWith('(') && raw.endsWith(')'))
    ? resolveArbitraryCssValue(raw)
    : null;
}

/** Negates a resolved CSS value without assuming it is a numeric literal. */
function negateCssValue(value: string): string {
  return /^\d/.test(value) ? `-${value}` : `calc(${value} * -1)`;
}

/** Returns the runtime-free formula shared by transition and animation stagger delays. */
function staggerDelay(): string {
  return 'calc((var(--cssx-stagger-index, 0) * (1 - var(--cssx-stagger-reverse, 0)) + (var(--cssx-stagger-count, 1) - 1 - var(--cssx-stagger-index, 0)) * var(--cssx-stagger-reverse, 0)) * var(--cssx-stagger, 0ms))';
}

/** Compiles animation timeline consumer utilities. */
function compileAnimationTimeline(utility: string): UtilityDeclaration | null {
  const fixed: Readonly<Record<string, string>> = {
    'animation-timeline-auto': 'auto',
    'animation-timeline-none': 'none',
  };
  if (fixed[utility]) {
    return { property: 'animation-timeline', value: fixed[utility] ?? '', atRule: TIMELINE_SUPPORT };
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
  return named ? { property: 'animation-timeline', value: named[1] ?? '', atRule: TIMELINE_SUPPORT } : null;
}

/** Compiles named timeline producer and scope utilities. */
function compileTimelineProducer(utility: string): UtilityDeclaration | null {
  const name = /^(scroll|view)-timeline-name-\[(--[a-z_][a-z0-9_-]*)\]$/i.exec(utility);
  if (name) {
    return {
      property: `${name[1]}-timeline-name`,
      value: name[2] ?? '',
      atRule: name[1] === 'scroll' ? SCROLL_TIMELINE_SUPPORT : VIEW_TIMELINE_SUPPORT,
    };
  }
  const axis = /^(scroll|view)-timeline-axis-(block|inline|x|y)$/.exec(utility);
  if (axis) {
    return {
      property: `${axis[1]}-timeline-axis`,
      value: axis[2] ?? '',
      atRule: axis[1] === 'scroll' ? SCROLL_TIMELINE_SUPPORT : VIEW_TIMELINE_SUPPORT,
    };
  }
  const inset = /^view-timeline-inset-(\[[\s\S]+\])$/.exec(utility);
  if (inset) {
    return {
      property: 'view-timeline-inset',
      value: resolveArbitraryCssValue(inset[1] ?? ''),
      atRule: VIEW_TIMELINE_SUPPORT,
    };
  }
  if (utility === 'timeline-scope-all') {
    return { property: 'timeline-scope', value: 'all', atRule: TIMELINE_SCOPE_SUPPORT };
  }
  const scope = /^timeline-scope-\[(--[a-z_][a-z0-9_-]*)\]$/i.exec(utility);
  return scope ? { property: 'timeline-scope', value: scope[1] ?? '', atRule: TIMELINE_SCOPE_SUPPORT } : null;
}

/** Compiles animation attachment range utilities. */
function compileAnimationRange(utility: string): UtilityDeclaration | null {
  const match = /^animation-range(?:-(start|end))?-(.+)$/.exec(utility);
  if (!match) {
    return null;
  }
  const property = match[1] ? `animation-range-${match[1]}` : 'animation-range';
  const raw = match[2] ?? '';
  const value = /^(normal|entry|exit|cover|contain)$/.test(raw) ? raw : arbitraryValue(raw);
  return value ? { property, value, atRule: RANGE_SUPPORT } : null;
}

/** Compiles validated View Transition name and class utilities. */
function compileViewTransitionUtility(utility: string): UtilityDeclaration | null {
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
  if (name && isCustomIdentifier(name[1] ?? '', ['auto', 'match-element', 'none'])) {
    return { property: 'view-transition-name', value: name[1] ?? '', atRule: VIEW_TRANSITION_NAME_SUPPORT };
  }
  if (utility === 'view-transition-class-none') {
    return { property: 'view-transition-class', value: 'none', atRule: VIEW_TRANSITION_CLASS_SUPPORT };
  }
  const classNames = /^view-transition-class-\[([^\]]+)\]$/.exec(utility);
  if (classNames) {
    const value = resolveArbitraryCssValue(`[${classNames[1] ?? ''}]`);
    if (value.split(/\s+/).every((part) => isCustomIdentifier(part, ['none']))) {
      return { property: 'view-transition-class', value, atRule: VIEW_TRANSITION_CLASS_SUPPORT };
    }
  }
  return null;
}

/** Checks a CSS-wide-keyword-safe custom identifier. */
function isCustomIdentifier(value: string, reserved: readonly string[]): boolean {
  return (
    /^[a-z_][a-z0-9_-]*$/i.test(value) &&
    !reserved.includes(value.toLowerCase()) &&
    !/^(?:inherit|initial|revert|revert-layer|unset)$/i.test(value)
  );
}
