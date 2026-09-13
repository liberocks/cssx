import { DEFAULT_KEYFRAMES, DEFAULT_THEME } from './theme-defaults';
import type { CssxTheme, ThemeOutputMode } from './theme-types';
import { readThemeModifier } from './read-theme-modifier';
import { skipThemeWhitespaceAndComments } from './skip-theme-whitespace-and-comments';
import { readThemeBalancedBlock } from './read-theme-balanced-block';
import { rewriteThemeReferences } from './rewrite-theme-references';
import { themeTokenName } from './theme-token-name';
import { referencedThemeTokens } from './referenced-theme-tokens';
import { splitThemeDeclarations } from './split-theme-declarations';
import { resolveThemeTokenValue } from './resolve-theme-token-value';

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
    const declarations = extractKeyframes(block.content, keyframes);
    parseThemeDeclarations(declarations, tokens);
    index = block.end;
  }
  return Object.freeze({ tokens: Object.freeze(tokens), keyframes: Object.freeze(keyframes), mode, prefix });
}

/**
 * Removes keyframe rules from a theme block and stores their validated CSS.
 *
 * @param block Theme block content.
 * @param keyframes Mutable keyframe store to update.
 * @returns Remaining declaration source.
 */
function extractKeyframes(block: string, keyframes: Record<string, string>): string {
  let declarations = '';
  let index = 0;
  while (index < block.length) {
    if (block.startsWith('@keyframes', index)) {
      index += '@keyframes'.length;
      index = skipThemeWhitespaceAndComments(block, index);
      const nameStart = index;
      while (/[a-z0-9_-]/i.test(block[index]!)) {
        index++;
      }
      const name = block.slice(nameStart, index);
      if (!/^[a-z_][a-z0-9_-]*$/i.test(name)) {
        throw new Error('Invalid CSSX @keyframes name.');
      }
      index = skipThemeWhitespaceAndComments(block, index);
      if (block[index] !== '{') {
        throw new Error(`Expected "{" after @keyframes ${name}.`);
      }
      const frameBlock = readThemeBalancedBlock(block, index);
      validateKeyframeBody(frameBlock.content, name);
      keyframes[name] = `@keyframes ${name}{${frameBlock.content}}`;
      index = frameBlock.end;
      continue;
    }
    declarations += block[index]!;
    index++;
  }
  return declarations;
}

/**
 * Validates the restricted selector and declaration grammar allowed in keyframes.
 *
 * @param body Content inside one keyframes rule.
 * @param name Keyframe name used in error messages.
 * @returns Nothing.
 */
function validateKeyframeBody(body: string, name: string): void {
  let index = 0;
  while (index < body.length) {
    index = skipThemeWhitespaceAndComments(body, index);
    if (index >= body.length) {
      return;
    }
    const selectorStart = index;
    while (body[index] !== '{' && index < body.length) {
      index++;
    }
    const selector = body.slice(selectorStart, index).trim();
    if (!selector || !selector.split(',').every((part) => /^(from|to|\d{1,3}(?:\.\d+)?%)$/.test(part.trim()))) {
      throw new Error(`Invalid CSSX @keyframes selector in ${name}.`);
    }
    if (body[index] !== '{') {
      throw new Error(`Unterminated CSSX @keyframes ${name}.`);
    }
    const declarationBlock = readThemeBalancedBlock(body, index);
    for (const declaration of splitThemeDeclarations(declarationBlock.content)) {
      const separator = declaration.indexOf(':');
      const property = declaration.slice(0, separator).trim();
      const value = declaration.slice(separator + 1).trim();
      if (separator === -1 || !/^(--[a-z0-9_-]+|[a-z-]+)$/i.test(property) || !value || /[{};]/.test(value)) {
        throw new Error(`Invalid CSSX @keyframes declaration in ${name}.`);
      }
    }
    index = declarationBlock.end;
  }
}

/**
 * Resolves a token for normal declaration output.
 *
 * @param theme Active resolved theme.
 * @param name Token name including its custom-property prefix.
 * @returns Concrete value for inline mode or a variable reference for other modes.
 */
export function resolveThemeToken(theme: CssxTheme, name: string): string | undefined {
  const value = resolveThemeValue(theme, name);
  if (value === undefined) {
    return undefined;
  }
  return theme.mode === 'inline' ? value : `var(${themeTokenName(theme, name)})`;
}

/**
 * Resolves a theme token to its concrete value, including for media queries.
 *
 * @param theme Active resolved theme.
 * @param name Token name including its custom-property prefix.
 * @returns Concrete value, or undefined when the token is absent or reset.
 */
export function resolveThemeValue(theme: CssxTheme, name: string): string | undefined {
  const value = theme.tokens[name];
  if (value === undefined || value === 'initial') {
    return undefined;
  }
  return resolveThemeTokenValue(theme.tokens, value, new Set([name]));
}

/**
 * Emits a variable root for non-inline themes, retaining only referenced values when possible.
 *
 * @param theme Active resolved theme.
 * @param css Utility CSS that may reference theme variables.
 * @returns Root variable CSS, or an empty string for inline or unused output.
 */
export function serializeThemeTokens(theme: CssxTheme, css: string): string {
  if (theme.mode === 'inline') {
    return '';
  }
  const names = theme.mode === 'static' ? Object.keys(theme.tokens) : referencedThemeTokens(theme, css);
  if (names.length === 0) {
    return '';
  }
  return `:root{${names
    .sort()
    .map((name) => `${themeTokenName(theme, name)}:${rewriteThemeReferences(theme, theme.tokens[name]!)}`)
    .join(';')}}`;
}

/**
 * Serializes one referenced keyframe rule for the active theme output mode.
 *
 * @param theme Active resolved theme.
 * @param name Keyframe identifier.
 * @returns Rewritten keyframe CSS, or undefined when the name is unknown.
 */
export function serializeThemeKeyframe(theme: CssxTheme, name: string): string | undefined {
  const keyframe = theme.keyframes[name];
  return keyframe === undefined ? undefined : rewriteThemeReferences(theme, keyframe);
}

/**
 * Parses declarations and namespace resets from one theme block.
 *
 * @param block Theme declaration source.
 * @param tokens Mutable token store to update.
 * @returns Nothing.
 */
function parseThemeDeclarations(block: string, tokens: Record<string, string>): void {
  for (const declaration of splitThemeDeclarations(block)) {
    const separator = declaration.indexOf(':');
    if (separator === -1) {
      throw new Error(`Invalid CSSX @theme declaration "${declaration}".`);
    }
    const name = declaration.slice(0, separator).trim();
    const value = declaration.slice(separator + 1).trim();
    if (name === '--*' || /^--[a-z0-9-]+-\*$/i.test(name)) {
      if (value !== 'initial') {
        throw new Error(`CSSX theme namespace reset "${name}" must use initial.`);
      }
      const prefix = name === '--*' ? '--' : name.slice(0, -1);
      for (const token of Object.keys(tokens)) {
        if (token.startsWith(prefix)) {
          delete tokens[token];
        }
      }
      continue;
    }
    if (!/^--[a-z0-9-]+$/i.test(name) || !value || /[{};]/.test(value)) {
      throw new Error(`Invalid CSSX @theme declaration "${declaration}".`);
    }
    tokens[name] = value;
  }
}
