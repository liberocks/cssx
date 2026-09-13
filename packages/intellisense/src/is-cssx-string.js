'use strict';
/* eslint-disable @typescript-eslint/no-require-imports */

/** Regex escaping helper. */
const { escapeRegex } = require('./escape-regex');
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
  const line = document.lineAt(position.line).text.slice(0, position.character);
  const configured = editor.workspace.getConfiguration('cssxIntelliSense').get('classFunctions', []);
  const functions = ['cssx.create', 'cssx.sx', 'sx', ...configured].map(escapeRegex).join('|');
  return (
    new RegExp(`(?:${functions})\\s*\\([^\\n]*['\"\x60][^'\"\x60]*$`).test(line) ||
    /\b(?:class|className)\s*=\s*['"`][^'"`]*$/.test(line)
  );
}

module.exports = { isCssxString };
