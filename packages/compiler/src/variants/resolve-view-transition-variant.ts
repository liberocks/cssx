/**
 * Resolves a View Transition pseudo-element variant to its selector suffix.
 *
 * @param variant View Transition variant name.
 * @returns Selector suffix for the pseudo-element, or null when unsupported.
 */
export function resolveViewTransitionVariant(variant: string): string | null {
  const match = /^vt-(group|image-pair|old|new)-\[([^\]]+)\]$/i.exec(variant);
  const target = match?.[2] ?? '';
  const validTarget =
    target === '*' ||
    /^\.[a-z_][a-z0-9_-]*$/i.test(target) ||
    (/^[a-z_][a-z0-9_-]*$/i.test(target) && !/^(?:inherit|initial|none|revert|revert-layer|unset)$/i.test(target));
  if (!match || !validTarget) {
    return null;
  }
  return `::view-transition-${match[1]}(${target})`;
}
