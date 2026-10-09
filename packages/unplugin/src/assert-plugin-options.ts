import type { CssxPluginOptions } from './options';
import { validateCssFileName } from './validate-css-file-name';

/**
 * Checks options that affect generated CSS and output paths.
 *
 * @param options Adapter options to validate.
 * @returns Nothing.
 */
export function assertPluginOptions(options: CssxPluginOptions): void {
  if (options.sourceRoots && options.sourceRoots.some((root) => typeof root !== 'string' || !root.trim())) {
    throw new Error('CSSX sourceRoots must contain non-empty file-system paths.');
  }
  if (
    options.debug !== undefined &&
    typeof options.debug !== 'boolean' &&
    (typeof options.debug !== 'object' || typeof options.debug.reportFile !== 'string' || !options.debug.reportFile)
  ) {
    throw new Error('CSSX debug must be a boolean or an object with a reportFile path.');
  }
  if (options.naming !== undefined && !['serial', 'hash', 'source'].includes(options.naming)) {
    throw new Error('CSSX naming must be "serial", "hash", or "source".');
  }
  if (options.coordination !== undefined && !['memory', 'manifest'].includes(options.coordination)) {
    throw new Error('CSSX coordination must be "memory" or "manifest".');
  }
  if (options.stableClassNames && options.naming && options.naming !== 'source') {
    throw new Error('CSSX stableClassNames selects source naming and conflicts with naming. Use naming: "source".');
  }
  if (options.stableClassNames && options.coordination === 'manifest') {
    throw new Error('CSSX stableClassNames already selects source naming; remove it to use manifest coordination.');
  }
  if (options.naming === 'hash' && options.className?.variant === 'serial') {
    throw new Error('CSSX naming: "hash" conflicts with className.variant: "serial".');
  }
  if (options.naming === 'serial' && options.className?.variant === 'random') {
    throw new Error('CSSX naming: "serial" conflicts with className.variant: "random".');
  }
  if (options.coordination === 'manifest' && !options.manifestPath) {
    throw new Error('CSSX coordination: "manifest" requires manifestPath.');
  }
  if (options.manifestPath && options.coordination !== 'manifest') {
    throw new Error('CSSX manifestPath requires coordination: "manifest".');
  }
  if (options.coordination === 'manifest' && options.classNameAllocator) {
    throw new Error('CSSX manifest coordination cannot use a custom classNameAllocator.');
  }
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
