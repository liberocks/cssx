import type { CssxCssLocation } from './stylesheet-types';

/**
 * Moves a generated CSS location forward by a CSS string.
 *
 * @param location Starting generated CSS location.
 * @param css CSS whose length advances the location.
 * @returns The generated CSS location after the string.
 */
export function advanceCssLocation(location: CssxCssLocation, css: string): CssxCssLocation {
  const lines = css.split('\n');
  return {
    line: location.line + lines.length - 1,
    column: lines.at(-1)!.length + location.column * Number(lines.length === 1),
  };
}
