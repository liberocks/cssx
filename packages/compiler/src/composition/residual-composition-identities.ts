import { compositeIdentity } from './composite-identity';
import { compositeNameIdentity } from './composite-name-identity';

/**
 * Returns unique compiler-scoped identities for non-empty residual compositions.
 *
 * @param residualCompositions Residual atom lists after reusable fragments are removed.
 * @returns Unique identities in first-seen composition order.
 */
export function residualCompositionIdentities(residualCompositions: readonly (readonly string[])[]): readonly string[] {
  const identities = new Set<string>();
  for (const residualAtoms of residualCompositions) {
    const identity = compositeIdentity(residualAtoms);
    if (identity) {
      identities.add(compositeNameIdentity(identity));
    }
  }
  return [...identities];
}
