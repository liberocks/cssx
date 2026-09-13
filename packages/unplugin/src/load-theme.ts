import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import type { CssxPluginOptions } from './options';

/**
 * Loads the configured theme source.
 *
 * @param options Adapter options that may provide inline theme source or a theme file.
 * @returns The theme source, or undefined when no theme is configured.
 */
export async function loadTheme(options: CssxPluginOptions): Promise<string | undefined> {
  return options.themeFile === undefined ? options.theme : readFile(resolve(process.cwd(), options.themeFile), 'utf8');
}
