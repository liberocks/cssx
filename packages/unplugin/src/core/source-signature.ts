import { createHash } from 'node:crypto';

/** Creates a fixed-size digest for source identity checks without retaining source text. */
export function sourceSignature(source: string): string {
  return createHash('sha256').update(source).digest('hex');
}
