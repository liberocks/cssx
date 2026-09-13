import { extractThemeKeyframes } from './extract-theme-keyframes';
import { parseThemeDeclarations } from './parse-theme-declarations';
import { readThemeBalancedBlock } from './read-theme-balanced-block';
import { readThemeModifier } from './read-theme-modifier';
import { skipThemeWhitespaceAndComments } from './skip-theme-whitespace-and-comments';
import { DEFAULT_THEME } from './theme-defaults';
import { DEFAULT_KEYFRAMES } from './theme-keyframes';
import type { CssxTheme, ThemeOutputMode } from './theme-types';

/** Maximum accepted CSS source length for a theme. */
const MAX_THEME_LENGTH = 131_072;

/** Immutable default theme returned when no theme source is provided. */
const DEFAULT_CSSX_THEME: CssxTheme = Object.freeze({
  tokens: Object.freeze({ ...DEFAULT_THEME }),
  keyframes: Object.freeze({ ...DEFAULT_KEYFRAMES }),
  mode: 'inline',
  prefix: '',
});

/**
 * Parses CSSX `@theme` blocks and combines them with the built-in theme.
 *
 * Parsing is deliberately narrow: only top-level theme blocks, declarations,
 * namespace resets, and validated keyframes are accepted. The result is frozen
 * so every later compilation phase reads one stable theme snapshot.
 *
 * @param source Optional CSSX theme source.
 * @returns Resolved immutable theme data.
 */
export function parseTheme(source = ''): CssxTheme {
  if (source.length > MAX_THEME_LENGTH) {
    throw new Error('CSSX theme input exceeds the 128 KiB limit.');
  }
  if (!source.trim()) {
    return DEFAULT_CSSX_THEME;
  }
  const tokens: Record<string, string> = { ...DEFAULT_THEME };
  const keyframes: Record<string, string> = { ...DEFAULT_KEYFRAMES };
  let mode: ThemeOutputMode = 'inline';
  let prefix = '';
  let configuredOutput: string | undefined;

  let index = 0;
  while (index < source.length) {
    index = skipThemeWhitespaceAndComments(source, index);
    if (index >= source.length) {
      break;
    }
    if (!source.startsWith('@theme', index)) {
      throw new Error('CSSX theme input only accepts @theme blocks.');
    }
    index += '@theme'.length;
    index = skipThemeWhitespaceAndComments(source, index);
    const modifier = readThemeModifier(source, index);
    if (modifier) {
      const output = `${modifier.mode}:${modifier.prefix}`;
      if (configuredOutput !== undefined && configuredOutput !== output) {
        throw new Error('CSSX theme blocks cannot use conflicting output modes or prefixes.');
      }
      configuredOutput = output;
      mode = modifier.mode;
      prefix = modifier.prefix;
      index = skipThemeWhitespaceAndComments(source, modifier.end);
    }
    if (source[index] !== '{') {
      throw new Error('Expected "{" after @theme.');
    }
    const block = readThemeBalancedBlock(source, index);
    const declarations = extractThemeKeyframes(block.content, keyframes);
    parseThemeDeclarations(declarations, tokens);
    index = block.end;
  }
  return Object.freeze({ tokens: Object.freeze(tokens), keyframes: Object.freeze(keyframes), mode, prefix });
}
