import { readFile } from 'node:fs/promises';
import { dirname, isAbsolute, normalize, resolve, sep } from 'node:path';
import type { ReusabilityBudget } from '@cssxio/compiler';

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
