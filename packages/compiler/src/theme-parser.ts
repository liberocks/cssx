import { DEFAULT_KEYFRAMES, DEFAULT_THEME } from './theme-defaults';
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
    index = skipWhitespaceAndComments(source, index);
    if (index >= source.length) {
      break;
    }
    if (!source.startsWith('@theme', index)) {
      throw new Error('CSSX theme input only accepts @theme blocks.');
    }
    index += '@theme'.length;
    index = skipWhitespaceAndComments(source, index);
    const modifier = readThemeModifier(source, index);
    if (modifier) {
      const output = `${modifier.mode}:${modifier.prefix}`;
      if (configuredOutput !== undefined && configuredOutput !== output) {
        throw new Error('CSSX theme blocks cannot use conflicting output modes or prefixes.');
      }
      configuredOutput = output;
      mode = modifier.mode;
      prefix = modifier.prefix;
      index = skipWhitespaceAndComments(source, modifier.end);
    }
    if (source[index] !== '{') {
      throw new Error('Expected "{" after @theme.');
    }
    const block = readBalancedBlock(source, index);
    const declarations = extractKeyframes(block.content, keyframes);
    parseThemeDeclarations(declarations, tokens);
    index = block.end;
  }
  return Object.freeze({ tokens: Object.freeze(tokens), keyframes: Object.freeze(keyframes), mode, prefix });
}

/**
 * Reads the optional output mode or variable prefix after `@theme`.
 *
 * @param source Complete theme source.
 * @param start Position immediately after `@theme` and whitespace.
 * @returns Parsed modifier and its end position, or null when absent.
 */
function readThemeModifier(
  source: string,
  start: number,
): { readonly mode: ThemeOutputMode; readonly prefix: string; readonly end: number } | null {
  const mode = /^(default|inline|reference|static)\b/.exec(source.slice(start));
  if (mode) {
    const value = mode[1] === 'reference' || mode[1] === 'static' ? mode[1] : 'inline';
    return { mode: value, prefix: '', end: start + mode[0].length };
  }
  const prefix = /^prefix\(([a-z_][a-z0-9_-]*)\)/i.exec(source.slice(start));
  if (prefix) {
    return { mode: 'reference', prefix: prefix[1] ?? '', end: start + prefix[0].length };
  }
  return null;
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
      index = skipWhitespaceAndComments(block, index);
      const nameStart = index;
      while (/[a-z0-9_-]/i.test(block[index] ?? '')) {
        index++;
      }
      const name = block.slice(nameStart, index);
      if (!/^[a-z_][a-z0-9_-]*$/i.test(name)) {
        throw new Error('Invalid CSSX @keyframes name.');
      }
      index = skipWhitespaceAndComments(block, index);
      if (block[index] !== '{') {
        throw new Error(`Expected "{" after @keyframes ${name}.`);
      }
      const frameBlock = readBalancedBlock(block, index);
      validateKeyframeBody(frameBlock.content, name);
      keyframes[name] = `@keyframes ${name}{${frameBlock.content}}`;
      index = frameBlock.end;
      continue;
    }
    declarations += block[index] ?? '';
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
    index = skipWhitespaceAndComments(body, index);
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
    const declarationBlock = readBalancedBlock(body, index);
    for (const declaration of splitDeclarations(declarationBlock.content)) {
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
  return resolveTokenValue(theme.tokens, value, new Set([name]));
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
    .map((name) => `${themeTokenName(theme, name)}:${rewriteThemeReferences(theme, theme.tokens[name] ?? '')}`)
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
  return keyframe ? rewriteThemeReferences(theme, keyframe) : undefined;
}

/**
 * Collects theme tokens referenced by CSS and all tokens they depend on.
 *
 * @param theme Active resolved theme.
 * @param css Utility CSS to inspect.
 * @returns Referenced token names.
 */
function referencedThemeTokens(theme: CssxTheme, css: string): string[] {
  const prefix = theme.prefix ? `--${theme.prefix}-` : '--';
  const names = new Set<string>();
  const expression = new RegExp(`var\\((${prefix.replace('-', '\\-')}[a-z0-9_-]+)`, 'gi');
  for (const match of css.matchAll(expression)) {
    const variable = match[1] ?? '';
    const name = theme.prefix ? `--${variable.slice(prefix.length)}` : variable;
    collectThemeTokenReferences(theme, name, names);
  }
  return [...names];
}

/**
 * Adds one live token and its variable dependencies to a set.
 *
 * @param theme Active resolved theme.
 * @param name Token name to visit.
 * @param names Set of already collected names.
 * @returns Nothing.
 */
function collectThemeTokenReferences(theme: CssxTheme, name: string, names: Set<string>): void {
  if (names.has(name) || theme.tokens[name] === undefined || theme.tokens[name] === 'initial') {
    return;
  }
  names.add(name);
  for (const match of (theme.tokens[name] ?? '').matchAll(/var\((--[a-z0-9_-]+)/gi)) {
    collectThemeTokenReferences(theme, match[1] ?? '', names);
  }
}

/**
 * Rewrites token references to use the configured output prefix.
 *
 * @param theme Active resolved theme.
 * @param value Raw token value.
 * @returns Value with rewritten variable references.
 */
function rewriteThemeReferences(theme: CssxTheme, value: string): string {
  return value.replace(/var\((--[a-z0-9_-]+)/gi, (_match, name: string) => `var(${themeTokenName(theme, name)}`);
}

/**
 * Gets the emitted custom-property name for a logical token name.
 *
 * @param theme Active resolved theme.
 * @param name Logical token name.
 * @returns Emitted custom-property name.
 */
function themeTokenName(theme: CssxTheme, name: string): string {
  return theme.prefix ? `--${theme.prefix}-${name.slice(2)}` : name;
}

/**
 * Parses declarations and namespace resets from one theme block.
 *
 * @param block Theme declaration source.
 * @param tokens Mutable token store to update.
 * @returns Nothing.
 */
function parseThemeDeclarations(block: string, tokens: Record<string, string>): void {
  for (const declaration of splitDeclarations(block)) {
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

/**
 * Recursively inlines token references while detecting missing and circular values.
 *
 * @param tokens Available theme tokens.
 * @param value Token value to resolve.
 * @param seen Tokens already visited on this resolution path.
 * @returns Fully resolved token value.
 */
function resolveTokenValue(tokens: Readonly<Record<string, string>>, value: string, seen: ReadonlySet<string>): string {
  return value.replace(/var\((--[a-z0-9-]+)\)/gi, (_match, reference: string) => {
    if (seen.has(reference)) {
      throw new Error(`Circular CSSX theme reference involving ${reference}.`);
    }
    const referenced = tokens[reference];
    if (referenced === undefined || referenced === 'initial') {
      throw new Error(`Unknown CSSX theme token ${reference}.`);
    }
    return resolveTokenValue(tokens, referenced, new Set([...seen, reference]));
  });
}

/**
 * Splits declarations without treating semicolons in strings or functions as separators.
 *
 * @param block Declaration source to scan.
 * @returns Trimmed non-empty declarations.
 */
function splitDeclarations(block: string): readonly string[] {
  const declarations: string[] = [];
  let token = '';
  let quote = '';
  let escaped = false;
  let parenthesisDepth = 0;
  for (const character of block) {
    if (escaped) {
      token += character;
      escaped = false;
      continue;
    }
    if (character === '\\') {
      token += character;
      escaped = true;
      continue;
    }
    if (quote) {
      token += character;
      if (character === quote) {
        quote = '';
      }
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      token += character;
      continue;
    }
    if (character === '(') {
      parenthesisDepth++;
    }
    if (character === ')') {
      parenthesisDepth--;
    }
    if (parenthesisDepth < 0) {
      throw new Error('Invalid CSSX @theme declaration.');
    }
    if (character === ';' && parenthesisDepth === 0) {
      if (token.trim()) {
        declarations.push(token.trim());
      }
      token = '';
      continue;
    }
    token += character;
  }
  if (quote || escaped || parenthesisDepth !== 0) {
    throw new Error('Invalid CSSX @theme declaration.');
  }
  if (token.trim()) {
    declarations.push(token.trim());
  }
  return declarations;
}

/**
 * Advances over CSS whitespace and complete comments.
 *
 * @param source Source to scan.
 * @param start Start position.
 * @returns First non-whitespace, non-comment position.
 */
function skipWhitespaceAndComments(source: string, start: number): number {
  let index = start;
  while (index < source.length) {
    if (/\s/.test(source[index] ?? '')) {
      index++;
      continue;
    }
    if (source.startsWith('/*', index)) {
      const end = source.indexOf('*/', index + 2);
      if (end === -1) {
        throw new Error('Unterminated CSSX theme comment.');
      }
      index = end + 2;
      continue;
    }
    break;
  }
  return index;
}

/**
 * Reads one brace-delimited block while honoring quoted strings and escapes.
 *
 * @param source Source containing the opening brace.
 * @param start Position of the opening brace.
 * @returns Block content and the first position after its closing brace.
 */
function readBalancedBlock(source: string, start: number): { readonly content: string; readonly end: number } {
  let depth = 0;
  let quote = '';
  let escaped = false;
  for (let index = start; index < source.length; index++) {
    const character = source[index] ?? '';
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === '\\') {
      escaped = true;
      continue;
    }
    if (quote) {
      if (character === quote) {
        quote = '';
      }
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === '{') {
      depth++;
    }
    if (character === '}') {
      depth--;
    }
    if (depth === 0) {
      return { content: source.slice(start + 1, index), end: index + 1 };
    }
    if (depth < 0) {
      break;
    }
  }
  throw new Error('Unterminated CSSX @theme block.');
}
