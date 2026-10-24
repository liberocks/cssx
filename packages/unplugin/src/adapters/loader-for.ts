import type { Loader } from 'esbuild';

/**
 * Selects the esbuild loader for a source file.
 *
 * @param id Source file path.
 * @returns The esbuild JavaScript or TypeScript loader.
 */
export function loaderFor(id: string): Loader {
  return /\.tsx?$/.test(id) ? 'ts' : 'js';
}
