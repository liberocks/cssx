/** Returns the next module-local selector identity without depending on source columns. */
export function nextStableCompositeOrdinal(state: { stableClassNameOrdinal?: number }): number {
  const ordinal = state.stableClassNameOrdinal ?? 0;
  state.stableClassNameOrdinal = ordinal + 1;
  return ordinal;
}
