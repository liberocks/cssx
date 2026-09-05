import { readFile } from 'node:fs/promises';
import { dirname, isAbsolute, normalize, resolve, sep } from 'node:path';
import type { DarkMode, ReusabilityBudget } from '@cssxio/compiler';

/** Options for a CSSX bundler adapter. */
export interface CssxPluginOptions {
  /** Module specifier that identifies source files using the CSSX runtime. */
  readonly importSource?: string;
  /** Relative output path for extracted CSS. The default is `cssx.css`. */
  readonly cssFileName?: string;
  /** Whether to generate a CSS source map. The default is `true`. */
  readonly sourceMap?: boolean;
  /** CSSX `@theme` source applied while transforming and compiling CSS. */
  readonly theme?: string;
  /** Path to a CSSX `@theme` file. Cannot be used with `theme`. */
  readonly themeFile?: string;
  /** Optional CSS layer that wraps the generated CSS. */
  readonly layer?: string;
  /** Controls how aggressively static styles share generated class fragments. */
  readonly reusabilityBudget?: ReusabilityBudget;
  /** Activates `dark` variants with a media query or a `[data-theme=dark]` selector. */
  readonly darkMode?: DarkMode;
  /** Adds CSSX's optional browser reset before generated utility rules. */
  readonly preflight?: boolean;
}

/**
 * Loads the configured theme source.
 *
 * @param options Adapter options that may provide inline theme source or a theme file.
 * @returns The theme source, or undefined when no theme is configured.
 */
export async function loadTheme(options: CssxPluginOptions): Promise<string | undefined> {
  if (options.themeFile === undefined) {
    return options.theme;
  }
  return readFile(resolve(process.cwd(), options.themeFile), 'utf8');
}

/**
 * Checks options that affect generated CSS and output paths.
 *
 * @param options Adapter options to validate.
 * @returns Nothing.
 */
export function assertPluginOptions(options: CssxPluginOptions): void {
  if (options.theme !== undefined && options.themeFile !== undefined) {
    throw new Error('CSSX accepts either theme or themeFile, not both.');
  }
  if (options.layer !== undefined && !/^[A-Za-z_-][A-Za-z0-9_-]*$/.test(options.layer)) {
    throw new Error('CSSX layer must be a valid CSS layer identifier.');
  }
  if (options.sourceMap !== undefined && typeof options.sourceMap !== 'boolean') {
    throw new Error('CSSX sourceMap must be a boolean.');
  }
  if (options.darkMode !== undefined && options.darkMode !== 'media' && options.darkMode !== 'selector') {
    throw new Error('CSSX darkMode must be "media" or "selector".');
  }
  if (options.preflight !== undefined && typeof options.preflight !== 'boolean') {
    throw new Error('CSSX preflight must be a boolean.');
  }
  if (
    options.reusabilityBudget !== undefined &&
    options.reusabilityBudget !== 'auto' &&
    (!Number.isFinite(options.reusabilityBudget) || options.reusabilityBudget < 0 || options.reusabilityBudget > 100)
  ) {
    throw new Error('CSSX reusabilityBudget must be "auto" or a number from 0 through 100.');
  }
  validateCssFileName(options.cssFileName ?? 'cssx.css');
}

/**
 * Creates a stable short identifier from a string.
 *
 * @param value String to hash.
 * @returns A base-36 hash suitable for a generated file name or class name.
 */
export function stableId(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

/**
 * Resolves a CSS output template and replaces each `[hash]` marker.
 *
 * @param template Relative CSS output path template.
 * @param css Generated CSS used to calculate the hash.
 * @returns A validated relative CSS output path.
 */
export function resolveCssFileName(template: string, css: string): string {
  return validateCssFileName(template).replaceAll('[hash]', stableId(css));
}

/**
 * Creates the development-server URL for an extracted stylesheet.
 *
 * @param base Development server base path.
 * @param fileName Relative CSS output path.
 * @returns An absolute URL path for the stylesheet.
 */
export function viteCssPath(base: string | undefined, fileName: string): string {
  const normalizedBase = base && base !== '/' ? `/${base.replace(/^\/+|\/+$/g, '')}` : '';
  return `${normalizedBase}/${validateCssFileName(fileName).replaceAll(sep, '/')}`;
}

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

/**
 * Removes query values from a module ID.
 *
 * @param id A module ID.
 * @returns The module ID without its query value.
 */
export function moduleId(id: string): string {
  return id.split('?', 1).join('');
}

/**
 * Validates a relative CSS output path.
 *
 * @param fileName CSS output path to validate.
 * @returns The normalized relative CSS path.
 */
function validateCssFileName(fileName: string): string {
  if (!fileName || isAbsolute(fileName)) {
    throw new Error('cssFileName must be a non-empty relative path.');
  }
  const normalized = normalize(fileName);
  if (normalized === '..' || normalized.startsWith(`..${sep}`)) {
    throw new Error('cssFileName must not escape the bundler output directory.');
  }
  if (!normalized.endsWith('.css')) {
    throw new Error('cssFileName must end in .css.');
  }
  return normalized;
}
