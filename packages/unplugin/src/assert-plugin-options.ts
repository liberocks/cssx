import type { CssxPluginOptions } from './options';
import { validateCssFileName } from './validate-css-file-name';

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
    options.darkMode !== undefined &&
    options.darkMode !== 'media' &&
    options.darkMode !== 'selector' &&
    options.darkMode !== 'class'
  ) {
    throw new Error('CSSX darkMode must be "media", "selector", or "class".');
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
