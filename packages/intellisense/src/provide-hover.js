'use strict';
/* eslint-disable @typescript-eslint/no-require-imports */

/** Utility help-text lookup. */
const { documentation } = require('./catalog');
/** CSSX string detector. */
const { isCssxString } = require('./is-cssx-string');

/**
 * Produces documentation hover content at the current editor position.
 *
 * @param {typeof import('vscode')} editor - The editor API.
 * @param {import('vscode').TextDocument} document - The open editor document.
 * @param {import('vscode').Position} position - The hover cursor position.
 * @returns {import('vscode').Hover | undefined} Hover content when a known CSSX utility is under the cursor.
 */
function provideHover(editor, document, position) {
  if (!isCssxString(document, position, editor)) {
    return undefined;
  }
  const range = document.getWordRangeAtPosition(position, /[^\s'"`]+/);
  if (!range) {
    return undefined;
  }
  const detail = documentation(document.getText(range));
  return detail ? new editor.Hover(new editor.MarkdownString(detail), range) : undefined;
}

module.exports = { provideHover };
