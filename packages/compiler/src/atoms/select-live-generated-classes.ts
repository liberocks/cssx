/**
 * Selects generated classes retained by a compiled style map.
 *
 * @param generatedClasses Classes allocated for the source candidate.
 * @param includedClasses Classes included in output, or undefined when all are retained.
 * @param selectorAliases Composite selectors that keep generated classes live.
 * @returns Generated classes selected directly or needed by a selector alias.
 */
export function selectLiveGeneratedClasses(
  generatedClasses: readonly string[],
  includedClasses: ReadonlySet<string> | undefined,
  selectorAliases: Readonly<Record<string, readonly string[]>>,
): readonly string[] {
  if (includedClasses === undefined) {
    return generatedClasses;
  }

  return generatedClasses.filter(
    (generatedClass) => includedClasses.has(generatedClass) || (selectorAliases[generatedClass]?.length ?? 0) > 0,
  );
}
