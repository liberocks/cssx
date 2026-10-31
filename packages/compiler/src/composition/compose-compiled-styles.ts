import type { ClassNameAllocator } from '../atoms/class-name';
import { createClassNameAllocator } from '../atoms/class-name-allocator';
import { packedAtomicClasses } from '../atoms/packed-atomic-classes';
import type { CompiledStyle } from '../shared/compiled-style';
import { structuralUtilityName } from '../utilities/registry/structural-utility-name';
import { compositeIdentity } from './composite-identity';
import { compositeNameIdentity } from './composite-name-identity';

/** A composite class and the atomic classes that implement it. */
export interface StyleComposition {
  /** Stable class for the complete reduced style. */
  readonly className: string;
  /** Composite class that has a generated selector, excluding structural markers. */
  readonly compositeClassName: string;
  /** Winning atomic classes in their source order. */
  readonly atomicClasses: readonly string[];
  /** Structural marker classes that must stay on the element but do not emit CSS. */
  readonly structuralClasses: readonly string[];
}

/**
 * Creates one composite class for a list of compiled styles.
 *
 * @param styles Compiled styles to compose from left to right.
 * @param classNameAllocator Optional allocator shared with the styles' compilation.
 * @returns The composite class and its winning atomic classes.
 */
export function composeCompiledStyles(
  styles: readonly CompiledStyle[],
  classNameAllocator: ClassNameAllocator = createClassNameAllocator(),
): StyleComposition {
  const records = styles.flatMap((style) => style._);
  const winningClasses = packedAtomicClasses(records);
  const structuralClassSet = new Set(
    records
      .filter(([, , group]) => structuralUtilityName(group) !== null)
      .map(([className]) => className)
      .filter((className): className is string => className !== null),
  );
  const structuralClasses = winningClasses.filter((className) => structuralClassSet.has(className));
  const atomicClasses = winningClasses.filter((className) => !structuralClassSet.has(className));
  const identity = compositeIdentity(atomicClasses);
  classNameAllocator.reserve(atomicClasses);
  const styleClassName = identity
    ? classNameAllocator.allocate([compositeNameIdentity(identity)]).get(compositeNameIdentity(identity))!
    : '';
  return {
    className: [styleClassName, ...structuralClasses].filter(Boolean).join(' '),
    compositeClassName: styleClassName,
    atomicClasses,
    structuralClasses,
  };
}
