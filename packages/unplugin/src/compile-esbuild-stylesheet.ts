import { loadTheme } from './options';
import type { CssxPluginOptions } from './options';
import { compileCssxStylesheet } from './stylesheet';
import type { CssxSourceModule } from './stylesheet-types';

/**
 * Compiles candidate data collected by esbuild into a stylesheet.
 *
 * @param modules Candidate data indexed by canonical source path.
 * @param options Adapter options that provide the theme and CSS layer.
 * @returns A promise for the generated stylesheet and optional source map.
 */
export async function compileEsbuildStylesheet(
  modules: readonly (readonly [string, CssxSourceModule])[],
  options: CssxPluginOptions,
): ReturnType<typeof compileCssxStylesheet> {
  const theme = await loadTheme(options);
  return compileCssxStylesheet(
    modules.map(([, data]) => data),
    theme,
    options.layer,
    options.sourceMap ?? true,
    options.darkMode,
    options.preflight,
  );
}
