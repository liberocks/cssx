'use strict';
/* eslint-disable @typescript-eslint/no-require-imports */

/** Utility help-text lookup. */
const { documentation } = require('./catalog');
/** CSSX string detector. */
const { cssxTokenAt } = require('./is-cssx-string');

/**
 * Produces documentation hover content at the current editor position.
 *
 * @param {typeof import('vscode')} editor - The editor API.
 * @param {import('vscode').TextDocument} document - The open editor document.
 * @param {import('vscode').Position} position - The hover cursor position.
 * @returns {import('vscode').Hover | undefined} Hover content when a known CSSX utility is under the cursor.
 */
function provideHover(editor, document, position) {
  const current = cssxTokenAt(document, position, editor);
  if (!current) {
    return undefined;
  }
  const detail = documentation(current.completeToken);
  return detail ? new editor.Hover(new editor.MarkdownString(detail), current.range) : undefined;
}

module.exports = { provideHover };
