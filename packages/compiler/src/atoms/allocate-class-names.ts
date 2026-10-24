import type { ClassNameAllocationState } from './class-name-allocation-state';
import { randomClassFragment } from './random-class-fragment';
import { serialClassFragment } from './serial-class-fragment';

/** Allocates stable, collision-free class names for the supplied identities. */
export function allocateClassNames(
  state: ClassNameAllocationState,
  identities: readonly string[],
): ReadonlyMap<string, string> {
  const newIdentities = [...new Set(identities)].filter((identity) => !state.classNames.has(identity)).sort();
  if (state.naming.variant === 'random' && state.naming.length !== undefined) {
    const capacity = 36n ** BigInt(state.naming.length);
    if (BigInt(newIdentities.length + state.allocated.size) > capacity) {
      throw new Error(
        `CSSX className.length ${state.naming.length} cannot name every generated class without a collision.`,
      );
    }
  }
  for (const identity of newIdentities) {
    let attempt = 0;
    let className = '';
    do {
      const core =
        state.naming.variant === 'serial'
          ? state.naming.prefix || state.naming.suffix
            ? serialClassFragment(state.serialCounter++)
            : String(state.serialCounter++)
          : randomClassFragment(identity, state.naming.length, attempt);
      className = `${state.naming.prefix}${core}${state.naming.suffix}`;
      attempt++;
    } while (state.allocated.has(className));
    state.allocated.add(className);
    state.classNames.set(identity, className);
  }
  return new Map(identities.map((identity) => [identity, state.classNames.get(identity)!] as const));
}
