import type { ThemeOutputMode } from './theme-types';

/** Theme output modifier parsed after an `@theme` directive. */
export interface ThemeModifier {
  /** Theme serialization mode. */
  readonly mode: ThemeOutputMode;
  /** Optional variable prefix. */
  readonly prefix: string;
  /** Offset immediately after the modifier. */
  readonly end: number;
}

/**
 * Reads the optional output mode or variable prefix after `@theme`.
 *
 * @param source Complete theme source.
 * @param start Position immediately after `@theme` and whitespace.
 * @returns Parsed modifier and its end position, or null when absent.
 */
export function readThemeModifier(source: string, start: number): ThemeModifier | null {
  const mode = /^(default|inline|reference|static)\b/.exec(source.slice(start));
  if (mode) {
    const value = mode[1] === 'reference' || mode[1] === 'static' ? mode[1] : 'inline';
    return { mode: value, prefix: '', end: start + mode[0].length };
  }
  const prefix = /^prefix\(([a-z_][a-z0-9_-]*)\)/i.exec(source.slice(start));
  if (prefix) {
    return { mode: 'reference', prefix: prefix[1]!, end: start + prefix[0].length };
  }
  return null;
}
