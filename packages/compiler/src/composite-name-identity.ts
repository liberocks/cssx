import { COMPILER_ABI } from './compiler-abi';

/**
 * Adds the compiler namespace to a composite identity before it receives a name.
 *
 * @param identity Stable identity of the composite's atomic classes.
 * @returns Compiler-scoped class-name identity.
 */
export function compositeNameIdentity(identity: string): string {
  return `${COMPILER_ABI}\u0000composite\u0000${identity}`;
}
