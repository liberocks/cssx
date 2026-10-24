'use strict';

/* eslint-disable @typescript-eslint/no-require-imports */

/** Editor API loader. */
const { loadEditorApi } = require('./load-editor-api');

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
 * @returns {{token: string, range: import('vscode').Range, start: number, end: number, segment: object} | undefined}
 * The token and replacement range when the cursor is in a CSSX string.
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
    const tokenRange = findTokenRange(source, segment.start, segment.end, cursor);
    return {
      token: source.slice(tokenRange.start, cursor),
      completeToken: source.slice(tokenRange.start, tokenRange.end),
      range: new editor.Range(document.positionAt(tokenRange.start), document.positionAt(tokenRange.end)),
      ...tokenRange,
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
 * @returns {{token: string, range: import('vscode').Range, start: number, end: number}[]}
 * Static utility tokens with exact document ranges.
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
    for (const range of tokenRanges(source, segment.start, segment.end)) {
      tokens.push({
        token: source.slice(range.start, range.end),
        range: new editor.Range(document.positionAt(range.start), document.positionAt(range.end)),
        ...range,
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
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];
    if (mode === 'single' || mode === 'double') {
      if (escaped) {
        escaped = false;
      } else if (character === '\\') {
        escaped = true;
      } else if (character === quote) {
        segments.push({
          start: contentStart,
          end: index,
          contextCall,
          attributeContext,
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
      } else if (character === '\\') {
        escaped = true;
      } else if (character === '`') {
        const template = templates.at(-1);
        segments.push({
          start: contentStart,
          end: index,
          contextCall: template.contextCall,
          attributeContext: template.attributeContext,
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
      attributeContext = isClassAttribute(source, index);
      mode = character === "'" ? 'single' : 'double';
    } else if (character === '`') {
      templates.push({
        start: index,
        inExpression: false,
        braceDepth: 0,
        contextCall: calls.at(-1) ?? null,
        attributeContext: isClassAttribute(source, index),
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
    segments.push({ start: contentStart, end: source.length, contextCall, attributeContext });
  }
  if (mode === 'template') {
    const template = templates.at(-1);
    segments.push({
      start: contentStart,
      end: source.length,
      contextCall: template.contextCall,
      attributeContext: template.attributeContext,
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

/** Checks whether a literal is the value of a JSX class attribute. */
function isClassAttribute(source, index) {
  return /\b(?:class|className)\s*=\s*(?:\{\s*)?$/.test(source.slice(Math.max(0, index - 80), index));
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
  const ranges = [];
  let tokenStart = -1;
  let squareDepth = 0;
  let innerQuote = '';
  let escaped = false;
  for (let index = start; index <= end; index += 1) {
    const character = index === end ? ' ' : source[index];
    if (innerQuote) {
      if (escaped) {
        escaped = false;
      } else if (character === '\\') {
        escaped = true;
      } else if (character === innerQuote) {
        innerQuote = '';
      }
      continue;
    }
    if (character === "'" || character === '"') {
      innerQuote = character;
      continue;
    }
    if (character === '[') {
      squareDepth += 1;
    } else if (character === ']') {
      squareDepth = Math.max(0, squareDepth - 1);
    }
    if (/\s/.test(character) && squareDepth === 0) {
      if (tokenStart !== -1) {
        ranges.push({ start: tokenStart, end: index });
      }
      tokenStart = -1;
    } else if (tokenStart === -1) {
      tokenStart = index;
    }
  }
  return ranges;
}

module.exports = { cssxTokenAt, cssxTokens, isCssxString };
