/** Creates a deterministic CSS-safe class name from a source anchor. */
export function stableCompositeName(
  fileName: string,
  location: { readonly line: number; readonly column: number } | undefined,
  kind: string,
): string {
  const anchor = `${fileName}\u0000${location?.line ?? 0}\u0000${location?.column ?? 0}\u0000${kind}`;
  let hash = 0xcbf29ce484222325n;
  for (let index = 0; index < anchor.length; index++) {
    hash ^= BigInt(anchor.charCodeAt(index));
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return `d${hash.toString(36)}`;
}

/** Returns the next module-local selector identity without depending on source columns. */
export function nextStableCompositeOrdinal(state: { stableClassNameOrdinal?: number }): number {
  const ordinal = state.stableClassNameOrdinal ?? 0;
  state.stableClassNameOrdinal = ordinal + 1;
  return ordinal;
}
