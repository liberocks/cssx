import type { ClassNameAllocator, ClassNameOptions } from '@cssxio/compiler';

/** Creates the package allocator contract without loading the full style compiler. */
export function createClassNameAllocator(options: ClassNameOptions = {}): ClassNameAllocator {
  const variant = options.variant ?? 'serial';
  const prefix = options.prefix ?? 's';
  const suffix = options.suffix ?? 'x';
  const length = options.length;
  if (variant !== 'random' && variant !== 'serial') {
    throw new Error('CSSX className.variant must be "random" or "serial".');
  }
  if (prefix && !/^[A-Za-z_-][A-Za-z0-9_-]*$/.test(prefix)) {
    throw new Error('CSSX className.prefix must be a safe CSS identifier prefix.');
  }
  if (!/^[A-Za-z0-9_-]*$/.test(suffix)) {
    throw new Error('CSSX className.suffix must contain only letters, digits, hyphens, or underscores.');
  }
  if (length !== undefined && (!Number.isSafeInteger(length) || length < 1 || length > 64)) {
    throw new Error('CSSX className.length must be an integer from 1 through 64.');
  }
  if (variant === 'serial' && length !== undefined) {
    throw new Error('CSSX className.length is only supported by the random naming variant.');
  }

  const classes = new Map<string, string>();
  const allocated = new Set<string>();
  let serialCounter = 0;
  return {
    allocate(identities) {
      let isCanonical = true;
      for (let index = 1; index < identities.length; index++) {
        if (identities[index - 1]! >= identities[index]!) {
          isCanonical = false;
          break;
        }
      }
      const newIdentities = isCanonical
        ? identities.filter((identity) => !classes.has(identity))
        : [...new Set(identities)].filter((identity) => !classes.has(identity)).sort();
      if (
        variant === 'random' &&
        length !== undefined &&
        BigInt(newIdentities.length + allocated.size) > 36n ** BigInt(length)
      ) {
        throw new Error(`CSSX className.length ${length} cannot name every generated class without a collision.`);
      }
      for (const identity of newIdentities) {
        let attempt = 0;
        let className: string;
        do {
          const core =
            variant === 'serial'
              ? prefix || suffix
                ? serialFragment(serialCounter++)
                : String(serialCounter++)
              : randomFragment(identity, length, attempt);
          className = `${prefix}${core}${suffix}`;
          attempt++;
        } while (allocated.has(className));
        allocated.add(className);
        classes.set(identity, className);
      }
      return new Map(identities.map((identity) => [identity, classes.get(identity)!] as const));
    },
    reserve(classNames) {
      for (const className of classNames) {
        allocated.add(className);
      }
    },
  };
}

/** Generates a deterministic fragment for a random class name. */
function randomFragment(identity: string, length: number | undefined, attempt: number): string {
  if (length === undefined) {
    return attempt === 0 ? hash(identity) : `${hash(identity)}-${hash(`${identity}\u0000${attempt}`)}`;
  }
  let fragment = '';
  for (let part = 0; fragment.length < length; part++) {
    fragment += hash(`${identity}\u0000${attempt}\u0000${part}`).padStart(13, '0');
  }
  return fragment.slice(0, length);
}

/** Hashes the UTF-16 code units of a class identity. */
function hash(value: string): string {
  let result = 0xcbf29ce484222325n;
  for (let index = 0; index < value.length; index++) {
    result ^= BigInt(value.charCodeAt(index));
    result = BigInt.asUintN(64, result * 0x100000001b3n);
  }
  return result.toString(36);
}

/** Characters used by serial class name fragments. */
const SERIAL_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** Converts a nonnegative integer to the compact serial alphabet. */
function serialFragment(value: number): string {
  let remaining = value;
  let fragment = '';
  do {
    fragment = `${SERIAL_ALPHABET[remaining % SERIAL_ALPHABET.length]}${fragment}`;
    remaining = Math.floor(remaining / SERIAL_ALPHABET.length);
  } while (remaining > 0);
  return fragment;
}
