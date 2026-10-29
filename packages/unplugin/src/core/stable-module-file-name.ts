import { relative, resolve, sep } from 'node:path';

import { canonicalPathSync } from './canonical-path';

/** Returns one stable module identity across symlinked and canonical paths. */
export function stableModuleFileName(root: string, fileName: string, development: boolean): string {
  const canonicalRoot = development ? canonicalPathSync(root) : resolve(root);
  const canonicalFileName = development ? canonicalPathSync(fileName) : resolve(fileName);
  return relative(canonicalRoot, canonicalFileName).replaceAll(sep, '/');
}
