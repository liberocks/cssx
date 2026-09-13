import type { ClassNameAllocator, CompiledStyle } from './conflicts';
import { createClassNameAllocator } from './class-name-allocator';
import { compositeIdentity } from './composite-identity';
import { compositeNameIdentity } from './composite-name-identity';
import { packedAtomicClasses } from './packed-atomic-classes';

/** A composite class and the atomic classes that implement it. */
export interface StyleComposition {
  /** Stable class for the complete reduced style. */
  readonly className: string;
  /** Winning atomic classes in their source order. */
  readonly atomicClasses: readonly string[];
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
  const atomicClasses = packedAtomicClasses(styles.flatMap((style) => style._));
  const identity = compositeIdentity(atomicClasses);
  classNameAllocator.reserve(atomicClasses);
  return {
    className: identity
      ? classNameAllocator.allocate([compositeNameIdentity(identity)]).get(compositeNameIdentity(identity))!
      : '',
    atomicClasses,
  };
}
