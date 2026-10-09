import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Resolves the loader sibling emitted in the same module format as the Next adapter. */
export function resolveNextLoaderPath(moduleUrl: string, commonJsDirectory?: string): string {
  const packageDirectory = commonJsDirectory ?? dirname(fileURLToPath(moduleUrl));
  const loaderExtension = commonJsDirectory ? '.cjs' : moduleUrl.endsWith('.ts') ? '.ts' : '.js';
  return resolve(packageDirectory, `next-loader${loaderExtension}`);
}
