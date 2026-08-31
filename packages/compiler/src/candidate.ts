/** Parsed parts of one supported static utility candidate. */
export interface ParsedCandidate {
  /** Original unmodified candidate string. */
  readonly raw: string;
  /** Ordered selector and responsive variants. */
  readonly variants: readonly string[];
  /** Utility name without variants, importance, or negation. */
  readonly utility: string;
  /** Whether declarations must use `!important`. */
  readonly important: boolean;
  /** Whether the utility value is negative. */
  readonly negative: boolean;
}

/** Variants whose order does not change their meaning. */
const COMMUTATIVE_VARIANTS = new Set([
  'active',
  'disabled',
  'empty',
  'enabled',
  'even',
  'first',
  'focus',
  'focus-visible',
  'focus-within',
  'hover',
  'last',
  'odd',
  'open',
  'required',
  'target',
  'visited',
]);

/** Stable order for sortable responsive and environment variants. */
const VARIANT_ORDER = new Map<string, number>([
  ['sm', 10],
  ['md', 20],
  ['lg', 30],
  ['xl', 40],
  ['2xl', 50],
  ['dark', 60],
  ['motion-safe', 65],
  ['motion-reduce', 65],
  ['print', 70],
]);

/** Maximum accepted length of a whitespace-separated utility list. */
const MAX_UTILITY_LIST_LENGTH = 16_384;
/** Maximum nesting depth accepted while scanning user-controlled syntax. */
const MAX_NESTING_DEPTH = 32;

/**
 * Splits a static utility list without treating whitespace in brackets as separators.
 *
 * @param source Whitespace-separated utility source.
 * @returns Individual utility candidates.
 */
export function splitCandidateList(source: string): readonly string[] {
  if (source.length > MAX_UTILITY_LIST_LENGTH) {
    throw new Error('CSSX utility list exceeds the 16 KiB limit.');
  }
  const candidates: string[] = [];
  let token = '';
  let bracketDepth = 0;
  let parenthesisDepth = 0;
  let quote = '';
  let escaped = false;

  for (const character of source) {
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
    if (character === '[') {
      bracketDepth++;
    }
    if (character === ']') {
      bracketDepth--;
    }
    if (character === '(') {
      parenthesisDepth++;
    }
    if (character === ')') {
      parenthesisDepth--;
    }
    if (
      bracketDepth < 0 ||
      parenthesisDepth < 0 ||
      bracketDepth > MAX_NESTING_DEPTH ||
      parenthesisDepth > MAX_NESTING_DEPTH
    ) {
      throw new Error(`Invalid utility list "${source}".`);
    }
    if (/\s/.test(character) && bracketDepth === 0 && parenthesisDepth === 0) {
      if (token) {
        candidates.push(token);
      }
      token = '';
      continue;
    }
    token += character;
  }

  if (escaped || quote || bracketDepth !== 0 || parenthesisDepth !== 0) {
    throw new Error(`Invalid utility list "${source}".`);
  }
  if (token) {
    candidates.push(token);
  }
  return candidates;
}

/**
 * Parses supported static candidate syntax and rejects CSS injection delimiters.
 *
 * @param raw Candidate source to validate and parse.
 * @returns Parsed candidate parts.
 */
export function parseCandidate(raw: string): ParsedCandidate {
  if (!raw || raw.length > 500) {
    throw new Error(`Invalid utility "${raw}".`);
  }
  const parts = splitTopLevel(raw, ':');
  const finalPart = parts.pop();
  if (!finalPart) {
    throw new Error(`Invalid utility "${raw}".`);
  }

  let utility = finalPart;
  let important = false;
  let negative = false;
  if (utility.startsWith('!')) {
    important = true;
    utility = utility.slice(1);
  }
  if (utility.endsWith('!')) {
    if (important) {
      throw new Error(`Invalid utility "${raw}".`);
    }
    important = true;
    utility = utility.slice(0, -1);
  }
  if (utility.startsWith('-')) {
    negative = true;
    utility = utility.slice(1);
  }
  if (
    !utility ||
    utility.startsWith('!') ||
    utility.endsWith('!') ||
    containsUnsafeTopLevelSyntax(utility) ||
    containsUnsafeArbitrarySyntax(utility)
  ) {
    throw new Error(`Invalid utility "${raw}".`);
  }

  const variants = normalizeVariants(parts, raw);
  return { raw, variants, utility, important, negative };
}

/**
 * Gets the merge scope shared by candidates with the same variants and importance.
 *
 * @param candidate Parsed candidate.
 * @returns Stable scope key for semantic conflict handling.
 */
export function candidateScope(candidate: ParsedCandidate): string {
  const scope = candidate.variants.join(':');
  return candidate.important ? (scope ? `${scope}!` : '!') : scope;
}

/**
 * Splits a candidate at separators outside brackets, parentheses, and strings.
 *
 * @param source Candidate source to scan.
 * @param separator Top-level separator to split on.
 * @returns Non-empty source parts.
 */
function splitTopLevel(source: string, separator: string): string[] {
  const parts: string[] = [];
  let token = '';
  let bracketDepth = 0;
  let parenthesisDepth = 0;
  let quote = '';
  let escaped = false;

  for (const character of source) {
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
    if (character === '[') {
      bracketDepth++;
    }
    if (character === ']') {
      bracketDepth--;
    }
    if (character === '(') {
      parenthesisDepth++;
    }
    if (character === ')') {
      parenthesisDepth--;
    }
    if (
      bracketDepth < 0 ||
      parenthesisDepth < 0 ||
      bracketDepth > MAX_NESTING_DEPTH ||
      parenthesisDepth > MAX_NESTING_DEPTH
    ) {
      throw new Error(`Invalid utility "${source}".`);
    }
    if (character === separator && bracketDepth === 0 && parenthesisDepth === 0) {
      if (!token) {
        throw new Error(`Invalid utility "${source}".`);
      }
      parts.push(token);
      token = '';
      continue;
    }
    token += character;
  }

  if (escaped || quote || bracketDepth !== 0 || parenthesisDepth !== 0) {
    throw new Error(`Invalid utility "${source}".`);
  }
  if (!token) {
    throw new Error(`Invalid utility "${source}".`);
  }
  parts.push(token);
  return parts;
}

/**
 * Gives commutative variants one canonical order so equivalent candidates share CSS.
 *
 * @param variants Parsed variant names.
 * @param raw Original candidate used in validation errors.
 * @returns Original or canonically ordered variants.
 */
function normalizeVariants(variants: readonly string[], raw: string): readonly string[] {
  for (const variant of variants) {
    if (!variant || containsUnsafeTopLevelSyntax(variant) || containsUnsafeArbitrarySyntax(variant)) {
      throw new Error(`Invalid utility "${raw}".`);
    }
  }
  const sortable = variants.every((variant) => COMMUTATIVE_VARIANTS.has(variant) || VARIANT_ORDER.has(variant));
  if (!sortable) {
    return variants;
  }
  return [...variants].sort((left, right) => {
    const leftOrder = VARIANT_ORDER.get(left) ?? 100;
    const rightOrder = VARIANT_ORDER.get(right) ?? 100;
    return leftOrder - rightOrder || left.localeCompare(right);
  });
}

/**
 * Detects block and declaration delimiters that escape a nested value.
 *
 * @param value Candidate part to inspect.
 * @returns Whether the part contains unsafe top-level syntax.
 */
function containsUnsafeTopLevelSyntax(value: string): boolean {
  let bracketDepth = 0;
  let parenthesisDepth = 0;
  let quote = '';
  let escaped = false;
  for (const character of value) {
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
    if (character === '[') {
      bracketDepth++;
    }
    if (character === ']') {
      bracketDepth--;
    }
    if (character === '(') {
      parenthesisDepth++;
    }
    if (character === ')') {
      parenthesisDepth--;
    }
    if (bracketDepth === 0 && parenthesisDepth === 0 && (character === ';' || character === '{' || character === '}')) {
      return true;
    }
  }
  return false;
}

/**
 * Detects delimiters that are forbidden anywhere in a value-only arbitrary input.
 *
 * @param value Arbitrary candidate part to inspect.
 * @returns Whether the part contains unsafe arbitrary syntax.
 */
function containsUnsafeArbitrarySyntax(value: string): boolean {
  let quote = '';
  let escaped = false;
  for (const character of value) {
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
    if (character === ';' || character === '{' || character === '}') {
      return true;
    }
  }
  return false;
}
