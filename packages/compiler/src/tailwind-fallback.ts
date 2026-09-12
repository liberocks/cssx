import { TAILWIND_4_FALLBACKS } from './tailwind-fallback.generated';

/**
 * Checked-in Tailwind 4.3.3 semantics for candidates that do not have a
 * hand-written CSSX recipe yet. The generator is development-only; this
 * module never loads Tailwind at runtime.
 */
export interface TailwindFallback {
  /** CSS emitted by Tailwind with the source candidate as its selector. */
  readonly css: string;
  /** Coarse write group used by CSSX's static composition records. */
  readonly group: string;
}

/** Looks up the immutable pinned fallback for one complete candidate. */
export function tailwindFallback(candidate: string): TailwindFallback | undefined {
  return TAILWIND_4_FALLBACKS[candidate];
}
