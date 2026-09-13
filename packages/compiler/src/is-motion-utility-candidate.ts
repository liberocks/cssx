/**
 * Checks whether a candidate must not fall through to legacy utility resolvers.
 *
 * @param utility Candidate without variants.
 * @returns True when the candidate uses a motion prefix.
 */
export function isMotionUtilityCandidate(utility: string): boolean {
  return MOTION_PREFIXES.some((prefix) => utility.startsWith(prefix));
}
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
