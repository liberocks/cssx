/**
 * Returns the runtime-free formula shared by transition and animation stagger delays.
 *
 * @returns The stagger delay formula.
 */
export function staggerDelay(): string {
  return 'calc((var(--cssx-stagger-index, 0) * (1 - var(--cssx-stagger-reverse, 0)) + (var(--cssx-stagger-count, 1) - 1 - var(--cssx-stagger-index, 0)) * var(--cssx-stagger-reverse, 0)) * var(--cssx-stagger, 0ms))';
}
