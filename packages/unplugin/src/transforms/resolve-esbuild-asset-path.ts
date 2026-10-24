import { dirname, resolve } from 'node:path';

/**
 * Resolves the absolute CSS asset path used by esbuild.
 *
 * @param workingDirectory esbuild's working directory.
 * @param buildOptions esbuild output path options.
 * @param buildOptions.outdir Output directory when the build uses one.
 * @param buildOptions.outfile Output file when the build uses one.
 * @param fileName Validated relative CSS output path.
 * @returns The absolute path where the CSS asset belongs.
 */
export function resolveEsbuildAssetPath(
  workingDirectory: string,
  buildOptions: { readonly outdir?: string; readonly outfile?: string },
  fileName: string,
): string {
  if (buildOptions.outdir) {
    return resolve(workingDirectory, buildOptions.outdir, fileName);
  }
  if (buildOptions.outfile) {
    return resolve(dirname(resolve(workingDirectory, buildOptions.outfile)), fileName);
  }
  return resolve(workingDirectory, fileName);
}
