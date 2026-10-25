'use strict';

/* eslint-disable @typescript-eslint/no-require-imports */

/** Editor API loader. */
const { loadEditorApi } = require('./load-editor-api');
/** Tolerant CSSX candidate scanner. */
const { splitCandidateRanges } = require('./candidate-syntax');

/**
 * Checks whether the cursor is inside a CSSX utility string.
 *
 * @param {import('vscode').TextDocument} document - The open editor document.
 * @param {import('vscode').Position} position - The cursor position.
 * @param {typeof import('vscode')} [editor] - The editor API used to read configuration.
 * @returns {boolean} True when CSSX suggestions can be shown.
 */
function isCssxString(document, position, editor = loadEditorApi()) {
  return Boolean(cssxTokenAt(document, position, editor));
}

/**
 * Finds the CSSX utility token at a document position.
 *
 * @param {import('vscode').TextDocument} document - The open editor document.
 * @param {import('vscode').Position} position - Cursor position.
 * @param {typeof import('vscode')} [editor] - The editor API used to read configuration.
 * @returns {{token: string, completeToken: string, rawToken: string, range: import('vscode').Range, start: number, end: number, logicalStart: number, logicalEnd: number, sourceOffsets: number[], segment: object} | undefined}
 * The logical token and source-mapped replacement range when the cursor is in a CSSX string.
 */
function cssxTokenAt(document, position, editor = loadEditorApi()) {
  const source = document.getText();
  const cursor = document.offsetAt(position);
  const config = editor.workspace.getConfiguration('cssxIntelliSense');
  const configured = config.get('classFunctions', []);
  const aliases = importedFunctions(source);
  const segments = stringSegments(source);

  for (const segment of segments) {
    if (cursor < segment.start || cursor > segment.end) {
      continue;
    }
    if (!isCssxContext(segment, configured, aliases)) {
      continue;
    }
    const decoded = decodeSegment(source, segment);
    const logicalCursor = logicalOffsetAtSourceOffset(decoded.sourceOffsets, cursor);
    const tokenRange = findTokenRange(decoded.value, 0, decoded.value.length, logicalCursor);
    const sourceStart = decoded.sourceOffsets[tokenRange.start];
    const sourceEnd = decoded.sourceOffsets[tokenRange.end];
    return {
      token: decoded.value.slice(tokenRange.start, Math.max(tokenRange.start, Math.min(logicalCursor, tokenRange.end))),
      completeToken: decoded.value.slice(tokenRange.start, tokenRange.end),
      rawToken: source.slice(sourceStart, sourceEnd),
      range: new editor.Range(document.positionAt(sourceStart), document.positionAt(sourceEnd)),
      start: sourceStart,
      end: sourceEnd,
      logicalStart: tokenRange.start,
      logicalEnd: tokenRange.end,
      sourceOffsets: decoded.sourceOffsets,
      segment,
    };
  }
  return undefined;
}

/**
 * Finds whitespace-separated utility tokens in every CSSX string in a document.
 *
 * @param {import('vscode').TextDocument} document - The open editor document.
 * @param {typeof import('vscode')} editor - The editor API.
 * @returns {{token: string, rawToken: string, range: import('vscode').Range, start: number, end: number, logicalStart: number, logicalEnd: number, sourceOffsets: number[]}[]}
 * Static utility tokens with exact document ranges and logical source mappings.
 */
function cssxTokens(document, editor = loadEditorApi()) {
  const source = document.getText();
  const config = editor.workspace.getConfiguration('cssxIntelliSense');
  const configured = config.get('classFunctions', []);
  const aliases = importedFunctions(source);
  const tokens = [];

  for (const segment of stringSegments(source)) {
    if (!isCssxContext(segment, configured, aliases)) {
      continue;
    }
    const decoded = decodeSegment(source, segment);
    for (const range of tokenRanges(decoded.value, 0, decoded.value.length)) {
      const sourceStart = decoded.sourceOffsets[range.start];
      const sourceEnd = decoded.sourceOffsets[range.end];
      tokens.push({
        token: decoded.value.slice(range.start, range.end),
        rawToken: source.slice(sourceStart, sourceEnd),
        range: new editor.Range(document.positionAt(sourceStart), document.positionAt(sourceEnd)),
        start: sourceStart,
        end: sourceEnd,
        logicalStart: range.start,
        logicalEnd: range.end,
        sourceOffsets: decoded.sourceOffsets,
      });
    }
  }
  return tokens;
}

/** Determines whether a string belongs to a CSSX call or class attribute. */
function isCssxContext(segment, configured, aliases) {
  if (segment.attributeContext) {
    return true;
  }
  const name = segment.contextCall;
  if (!name) {
    return false;
  }
  const functions = new Set(['cssx.create', 'cssx.sx', 'sx', ...configured, ...aliases]);
  return functions.has(name);
}

/** Collects local aliases imported from the CSSX package. */
function importedFunctions(source) {
  const aliases = new Set();
  const imports = /\bimport\s+([\s\S]*?)\s+from\s*['"]@cssxio\/cssx['"]/g;
  for (const match of source.matchAll(imports)) {
    const clause = match[1];
    const namespace = /\*\s+as\s+([\w$]+)/.exec(clause)?.[1];
    const defaultImport = /^\s*([\w$]+)\s*(?:,|$)/.exec(clause)?.[1];
    if (namespace) {
      aliases.add(`${namespace}.create`);
      aliases.add(`${namespace}.sx`);
    }
    if (defaultImport) {
      aliases.add(`${defaultImport}.create`);
      aliases.add(`${defaultImport}.sx`);
    }
    const named = /\{([^}]*)\}/.exec(clause)?.[1];
    if (named) {
      for (const specifier of named.split(',')) {
        const parts = specifier.trim().split(/\s+as\s+/);
        const imported = parts[0];
        const local = parts[1] ?? imported;
        if (imported === 'sx' || imported === 'create') {
          aliases.add(local);
        }
      }
    }
  }
  return aliases;
}

/** Lexes static string segments while skipping comments and interpolation code. */
function stringSegments(source) {
  const segments = [];
  const templates = [];
  const calls = [];
  let mode = 'code';
  let quote = '';
  let contentStart = -1;
  let contextCall = null;
  let attributeContext = false;
  let decodeEscapes = true;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];
    if (mode === 'single' || mode === 'double') {
      if (escaped) {
        escaped = false;
        if (character === '\r' && next === '\n') {
          index += 1;
        }
      } else if (character === '\\') {
        escaped = true;
      } else if (character === quote) {
        segments.push({
          start: contentStart,
          end: index,
          contextCall,
          attributeContext,
          decodeEscapes,
        });
        mode = 'code';
      } else if (character === '\n' || character === '\r') {
        mode = 'code';
      }
      continue;
    }
    if (mode === 'template') {
      if (escaped) {
        escaped = false;
        if (character === '\r' && next === '\n') {
          index += 1;
        }
      } else if (character === '\\') {
        escaped = true;
      } else if (character === '`') {
        const template = templates.at(-1);
        segments.push({
          start: contentStart,
          end: index,
          contextCall: template.contextCall,
          attributeContext: template.attributeContext,
          decodeEscapes: template.decodeEscapes,
        });
        templates.pop();
        mode = 'code';
      } else if (character === '$' && next === '{') {
        const template = templates.at(-1);
        segments.push({
          start: contentStart,
          end: index,
          contextCall: template.contextCall,
          attributeContext: template.attributeContext,
          decodeEscapes: template.decodeEscapes,
        });
        templates.at(-1).inExpression = true;
        templates.at(-1).braceDepth = 0;
        mode = 'code';
        index += 1;
      }
      continue;
    }
    if (lineComment) {
      if (character === '\n') {
        lineComment = false;
      }
      continue;
    }
    if (blockComment) {
      if (character === '*' && next === '/') {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    const currentTemplate = templates.at(-1);
    if (currentTemplate?.inExpression) {
      if (character === '{') {
        currentTemplate.braceDepth += 1;
      } else if (character === '}') {
        if (currentTemplate.braceDepth === 0) {
          currentTemplate.inExpression = false;
          contentStart = index + 1;
          mode = 'template';
          continue;
        }
        currentTemplate.braceDepth -= 1;
      }
    }
    if (character === '/' && next === '/') {
      lineComment = true;
      index += 1;
    } else if (character === '/' && next === '*') {
      blockComment = true;
      index += 1;
    } else if (character === "'" || character === '"') {
      quote = character;
      contentStart = index + 1;
      contextCall = calls.at(-1) ?? null;
      const attributeKind = isClassAttribute(source, index);
      attributeContext = Boolean(attributeKind);
      decodeEscapes = attributeKind !== 'literal';
      mode = character === "'" ? 'single' : 'double';
    } else if (character === '`') {
      templates.push({
        start: index,
        inExpression: false,
        braceDepth: 0,
        contextCall: calls.at(-1) ?? null,
        attributeContext: Boolean(isClassAttribute(source, index)),
        decodeEscapes: true,
      });
      contentStart = index + 1;
      mode = 'template';
    } else if (character === '(') {
      calls.push(callNameBefore(source, index));
    } else if (character === ')') {
      calls.pop();
    }
  }

  if (mode === 'single' || mode === 'double') {
    segments.push({ start: contentStart, end: source.length, contextCall, attributeContext, decodeEscapes });
  }
  if (mode === 'template') {
    const template = templates.at(-1);
    segments.push({
      start: contentStart,
      end: source.length,
      contextCall: template.contextCall,
      attributeContext: template.attributeContext,
      decodeEscapes: template.decodeEscapes,
    });
  }
  return segments;
}

/** Identifies a nearby function call without repeatedly scanning the document. */
function callNameBefore(source, index) {
  const start = Math.max(0, index - 256);
  const call = /([\w$]+(?:\s*\.\s*[\w$]+)*)\s*$/.exec(source.slice(start, index))?.[1];
  return call?.replace(/\s+/g, '') ?? null;
}

/** Identifies a direct JSX class attribute or a JavaScript expression value. */
function isClassAttribute(source, index) {
  const prefix = source.slice(Math.max(0, index - 80), index);
  const match = /\b(?:class|className)\s*=\s*(\{\s*)?$/.exec(prefix);
  return match ? (match[1] ? 'expression' : 'literal') : undefined;
}

/** Finds the utility replacement range at a cursor position. */
function findTokenRange(source, start, end, cursor) {
  return (
    tokenRanges(source, start, end).find((range) => cursor >= range.start && cursor <= range.end) ?? {
      start: cursor,
      end: cursor,
    }
  );
}

/** Splits a CSSX string into whitespace-separated, bracket-aware utilities. */
function tokenRanges(source, start, end) {
  return splitCandidateRanges(source.slice(start, end)).map(({ start: tokenStart, end: tokenEnd }) => ({
    start: start + tokenStart,
    end: start + tokenEnd,
  }));
}

/** Decodes JavaScript string escapes and maps logical offsets back to source. */
function decodeSegment(source, segment) {
  const { start, end } = segment;
  if (!segment.decodeEscapes) {
    const value = source.slice(start, end);
    return { value, sourceOffsets: Array.from({ length: value.length + 1 }, (_, index) => start + index) };
  }

  const simpleEscapes = {
    0: '\0',
    "'": "'",
    '"': '"',
    '\\': '\\',
    b: '\b',
    f: '\f',
    n: '\n',
    r: '\r',
    t: '\t',
    v: '\v',
    '`': '`',
    $: '$',
  };
  const sourceOffsets = [start];
  let value = '';
  let index = start;

  while (index < end) {
    const rawStart = index;
    const character = source[index];
    if (character !== '\\') {
      value += character;
      sourceOffsets[sourceOffsets.length - 1] = index;
      sourceOffsets.push(index + 1);
      index += 1;
      continue;
    }

    const escaped = source[index + 1];
    if (index + 1 >= end) {
      value += '\\';
      sourceOffsets[sourceOffsets.length - 1] = index;
      sourceOffsets.push(index + 1);
      index += 1;
      continue;
    }
    if (escaped === '\n' || escaped === '\r') {
      index += escaped === '\r' && source[index + 2] === '\n' ? 3 : 2;
      sourceOffsets[sourceOffsets.length - 1] = index;
      continue;
    }

    let decoded;
    let consumed = 2;
    if (Object.hasOwn(simpleEscapes, escaped) && !(escaped === '0' && /\d/.test(source[index + 2] ?? ''))) {
      decoded = simpleEscapes[escaped];
    } else if (escaped === 'x') {
      const hex = /^[\da-f]{2}/i.exec(source.slice(index + 2, end))?.[0];
      if (hex) {
        decoded = String.fromCodePoint(Number.parseInt(hex, 16));
        consumed = 4;
      }
    } else if (escaped === 'u') {
      const rest = source.slice(index + 2, end);
      const unicodeCodePoint = /^\{([\da-f]{1,6})\}/i.exec(rest);
      const unicodeCharacter = /^[\da-f]{4}/i.exec(rest)?.[0];
      if (unicodeCodePoint && Number.parseInt(unicodeCodePoint[1], 16) <= 0x10ffff) {
        decoded = String.fromCodePoint(Number.parseInt(unicodeCodePoint[1], 16));
        consumed = unicodeCodePoint[0].length + 2;
      } else if (unicodeCharacter) {
        decoded = String.fromCodePoint(Number.parseInt(unicodeCharacter, 16));
        consumed = 6;
      }
    }
    if (decoded === undefined) {
      decoded = escaped;
    }
    value += decoded;
    sourceOffsets[sourceOffsets.length - 1] = rawStart;
    for (let width = 0; width < decoded.length; width += 1) {
      sourceOffsets.push(index + consumed);
    }
    index += consumed;
  }

  return { value, sourceOffsets };
}

/** Maps a raw document offset to the nearest preceding logical string boundary. */
function logicalOffsetAtSourceOffset(sourceOffsets, sourceOffset) {
  let low = 0;
  let high = sourceOffsets.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (sourceOffsets[middle] <= sourceOffset) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }
  return Math.max(0, low - 1);
}

module.exports = { cssxTokenAt, cssxTokens, isCssxString };
