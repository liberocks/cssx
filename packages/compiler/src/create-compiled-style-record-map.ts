import type { CompiledStyle } from './compiled-style';
import type { CompiledUtility } from './compiled-utility';
import { compositeIdentity } from './composite-identity';
import type { ReusabilityPlan } from './reusability';

/** Inputs required to project one source map's records to runtime class names. */
export interface CreateCompiledStyleRecordMapOptions {
  /** Candidate lists keyed by style name. */
  readonly candidates: Readonly<Record<string, readonly string[]>>;
  /** Generated class names keyed by utility candidate. */
  readonly classes: Readonly<Record<string, string>>;
  /** Packed conflict records keyed by style name. */
  readonly recordsByStyle: Readonly<Record<string, readonly CompiledUtility[]>>;
  /** Packed atom identities keyed by style name. */
  readonly compositionAtomsByStyle: Readonly<Record<string, readonly string[]>>;
  /** Allocated concrete names for symbolic atom identities. */
  readonly allocatedAtomClasses: ReadonlyMap<string, string>;
  /** Reusable aliases selected for every style composition. */
  readonly plannedCompositions: ReusabilityPlan;
}

/**
 * Projects one source style map into runtime records and reusable composites.
 *
 * @param options Source candidates, symbolic records, and allocated names.
 * @returns Compiled records for this map and the composite aliases they require.
 */
export function createCompiledStyleRecordMap(options: CreateCompiledStyleRecordMapOptions) {
  const { candidates, classes, recordsByStyle, compositionAtomsByStyle, allocatedAtomClasses, plannedCompositions } =
    options;
  const styles: Record<string, CompiledStyle> = Object.create(null) as Record<string, CompiledStyle>;
  const classNamesByStyle: Record<string, string> = Object.create(null) as Record<string, string>;
  const composites: Record<string, readonly string[]> = Object.create(null) as Record<string, readonly string[]>;

  for (const name of Object.keys(candidates)) {
    const atomicIdentities = compositionAtomsByStyle[name]!;
    const identity = compositeIdentity(atomicIdentities);
    const plannedClassName = plannedCompositions.classNames.get(identity) ?? '';
    const className = plannedClassName
      .split(' ')
      .map((value) => allocatedAtomClasses.get(value) ?? value)
      .join(' ');
    const records = recordsByStyle[name]!.map((record) => {
      const [atomicIdentity, ...rest] = record;
      return [atomicIdentity === null ? null : allocatedAtomClasses.get(atomicIdentity)!, ...rest] as CompiledUtility;
    });
    styles[name] = { $$css: 2, c: className, _: records };
    classNamesByStyle[name] = className;
    for (const fragment of plannedCompositions.fragments.get(identity) ?? []) {
      composites[fragment.className] = fragment.atomicClasses.map((atomicIdentity) =>
        allocatedAtomClasses.get(atomicIdentity)!,
      );
    }
  }

  return {
    styleMap: { styles, classes, candidates, classNames: classNamesByStyle, composites },
    composites,
  };
}
