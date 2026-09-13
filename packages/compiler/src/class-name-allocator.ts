import type { ClassNameAllocator, ClassNameOptions } from './conflicts';
import { normalizeClassNameOptions } from './normalize-class-name-options';
import type { NormalizedClassNameOptions } from './normalize-class-name-options';
import { randomClassFragment } from './random-class-fragment';
import { serialClassFragment } from './serial-class-fragment';

/**
 * Creates a stateful allocator for unique generated class names.
 *
 * @param options User-supplied naming options.
 * @returns An allocator that preserves identity assignments and reserved names.
 */
export function createClassNameAllocator(options: ClassNameOptions = {}): ClassNameAllocator {
  return new GeneratedClassNameAllocator(normalizeClassNameOptions(options));
}

/** Allocates generated class names while preserving previous identity assignments. */
class GeneratedClassNameAllocator implements ClassNameAllocator {
  private readonly classNames = new Map<string, string>();
  private readonly allocated = new Set<string>();
  private serialCounter = 0;

  /**
   * Creates an allocator with already validated naming options.
   *
   * @param naming Validated name format and hash settings.
   */
  constructor(private readonly naming: NormalizedClassNameOptions) {}

  /**
   * Allocates one stable name for every identity and returns names in input order.
   *
   * @param identities Identities to allocate, including any repeated values.
   * @returns Identity-to-name mappings in the supplied order.
   */
  allocate(identities: readonly string[]): ReadonlyMap<string, string> {
    const newIdentities = [...new Set(identities)].filter((identity) => !this.classNames.has(identity)).sort();
    if (this.naming.variant === 'random' && this.naming.length !== undefined) {
      const capacity = 36n ** BigInt(this.naming.length);
      if (BigInt(newIdentities.length + this.allocated.size) > capacity) {
        throw new Error(
          `CSSX className.length ${this.naming.length} cannot name every generated class without a collision.`,
        );
      }
    }
    for (const identity of newIdentities) {
      let attempt = 0;
      let className = '';
      do {
        const core =
          this.naming.variant === 'serial'
            ? this.naming.prefix || this.naming.suffix
              ? serialClassFragment(this.serialCounter++)
              : String(this.serialCounter++)
            : randomClassFragment(identity, this.naming.length, attempt);
        className = `${this.naming.prefix}${core}${this.naming.suffix}`;
        attempt++;
      } while (this.allocated.has(className));
      this.allocated.add(className);
      this.classNames.set(identity, className);
    }
    return new Map(identities.map((identity) => [identity, this.classNames.get(identity)!] as const));
  }

  /**
   * Reserves names allocated by another compilation so future allocations avoid them.
   *
   * @param classNames Existing class names unavailable to this allocator.
   */
  reserve(classNames: readonly string[]): void {
    for (const className of classNames) {
      this.allocated.add(className);
    }
  }
}
