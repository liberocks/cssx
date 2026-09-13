import type { ClassNameOptions } from './class-name';

/** Fully validated options used while allocating generated classes. */
export interface NormalizedClassNameOptions {
  readonly variant: 'random' | 'serial';
  readonly prefix: string;
  readonly suffix: string;
  readonly length?: number;
}

/**
 * Validates and supplies defaults for class-name options.
 *
 * @param options User-supplied naming options.
 * @returns Validated naming options.
 */
export function normalizeClassNameOptions(options: ClassNameOptions | undefined): NormalizedClassNameOptions {
  const variant = options?.variant ?? 'serial';
  const prefix = options?.prefix ?? 's';
  const suffix = options?.suffix ?? 'x';
  const length = options?.length;
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
  return { variant, prefix, suffix, ...(length === undefined ? {} : { length }) };
}
