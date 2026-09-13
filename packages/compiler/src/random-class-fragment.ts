import { hashClassNameIdentity } from './hash-class-name-identity';

/**
 * Creates a stable base-36 hash fragment, expanding deterministically when needed.
 *
 * @param identity Full declaration or composition identity.
 * @param length Requested fixed fragment length, when configured.
 * @param attempt Collision-resolution attempt.
 * @returns A stable hash fragment.
 */
export function randomClassFragment(identity: string, length: number | undefined, attempt: number): string {
  if (length === undefined) {
    return attempt === 0
      ? hashClassNameIdentity(identity)
      : `${hashClassNameIdentity(identity)}-${hashClassNameIdentity(`${identity}\u0000${attempt}`)}`;
  }
  let fragment = '';
  for (let part = 0; fragment.length < length; part++) {
    fragment += hashClassNameIdentity(`${identity}\u0000${attempt}\u0000${part}`).padStart(13, '0');
  }
  return fragment.slice(0, length);
}
