'use strict';
/* eslint-disable @typescript-eslint/no-require-imports */

/** CSSX strings with exact source locations. */
const { cssxTokens } = require('./is-cssx-string');
/** Parses palette color utilities and their presentation prefix. */
const { hexToRgba, parseColorCandidate } = require('./color-utils');

/**
 * Provides palette colors found in CSSX utility strings.
 *
 * @param {typeof import('vscode')} editor - The editor API.
 * @param {import('vscode').TextDocument} document - The open editor document.
 * @returns {import('vscode').ColorInformation[]} Color values and source ranges.
 */
function provideDocumentColors(editor, document) {
  if (!editor.workspace.getConfiguration('cssxIntelliSense').get('colorDecorators', true)) {
    return [];
  }
  return cssxTokens(document, editor).flatMap(({ token, range }) => {
    const color = parseColorCandidate(token);
    if (!color) {
      return [];
    }
    const rgba = hexToRgba(color.hex);
    return [new editor.ColorInformation(range, new editor.Color(rgba[0], rgba[1], rgba[2], rgba[3]))];
  });
}

/**
 * Keeps the utility prefix while presenting a picked color as a CSSX arbitrary value.
 *
 * @param {typeof import('vscode')} editor - The editor API.
 * @param {import('vscode').Color} color - Picked color.
 * @param {{document: import('vscode').TextDocument, range: import('vscode').Range}} context - Color source.
 * @returns {import('vscode').ColorPresentation[]} Replacement presentations.
 */
function provideColorPresentations(editor, color, context) {
  if (!editor.workspace.getConfiguration('cssxIntelliSense').get('colorDecorators', true)) {
    return [];
  }
  const sourceStart = context.document.offsetAt(context.range.start);
  const sourceEnd = context.document.offsetAt(context.range.end);
  const sourceToken = cssxTokens(context.document, editor).find(
    (token) => token.start === sourceStart && token.end === sourceEnd,
  );
  const candidate = sourceToken?.token ?? context.document.getText(context.range);
  const parsed = parseColorCandidate(candidate);
  if (!parsed) {
    return [];
  }
  const channel = (value) =>
    Math.round(value * 255)
      .toString(16)
      .padStart(2, '0');
  const alpha = Math.round(color.alpha * 255);
  const hex = `#${channel(color.red)}${channel(color.green)}${channel(color.blue)}${alpha < 255 ? channel(color.alpha) : ''}`;
  const sourceVariantPrefix = sourceToken
    ? context.document.getText(
        new editor.Range(
          context.document.positionAt(sourceStart),
          context.document.positionAt(sourceToken.sourceOffsets[sourceToken.logicalStart + parsed.variant.length]),
        ),
      )
    : parsed.variant;
  const label = `${sourceVariantPrefix}${parsed.prefix.slice(parsed.variant.length)}[${hex}]`;
  const presentation = new editor.ColorPresentation(label);
  presentation.textEdit = editor.TextEdit.replace(context.range, label);
  return [presentation];
}

module.exports = { provideColorPresentations, provideDocumentColors };
