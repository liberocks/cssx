/**
 * Inverts composite-to-atom metadata for selector serialization.
 *
 * @param composites Winning atomic classes keyed by composite class name.
 * @returns Composite class names keyed by each atomic class name.
 */
export function createSelectorAliases(
  composites: Readonly<Record<string, readonly string[]>>,
): Readonly<Record<string, readonly string[]>> {
  const aliases: Record<string, string[]> = Object.create(null) as Record<string, string[]>;
  for (const [composite, atomicClasses] of Object.entries(composites)) {
    for (const atomicClass of atomicClasses) {
      (aliases[atomicClass] ??= []).push(composite);
    }
  }
  return aliases;
}
