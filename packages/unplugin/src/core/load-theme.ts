import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

import type { CssxPluginOptions } from './options';

/**
 *
 */
const themeCache = new Map<string, { readonly signature: string; readonly source: string }>();

/**
 * Loads the configured theme source.
 *
 * @param options Adapter options that may provide inline theme source or a theme file.
 * @param root Directory used to resolve a relative theme file.
 * @returns The theme source, or undefined when no theme is configured.
 */
export async function loadTheme(options: CssxPluginOptions, root = process.cwd()): Promise<string | undefined> {
  if (options.themeFile === undefined) {
    return options.theme;
  }
  const fileName = resolve(root, options.themeFile);
  const info = await stat(fileName, { bigint: true });
  const signature = `${info.dev}:${info.ino}:${info.size}:${info.mtimeNs}:${info.ctimeNs}`;
  const cached = themeCache.get(fileName);
  if (cached?.signature === signature) {
    return cached.source;
  }
  const source = await readFile(fileName, 'utf8');
  themeCache.set(fileName, { signature, source });
  return source;
}
