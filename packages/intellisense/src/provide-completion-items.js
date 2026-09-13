'use strict';
/* eslint-disable @typescript-eslint/no-require-imports */

/** Completion catalog lookup. */
const { entries } = require('./catalog');
/** Completion item factory. */
const { createCompletionItem } = require('./create-completion-item');
/** CSSX string detector. */
const { isCssxString } = require('./is-cssx-string');

/**
 * Produces utility completions at the current editor position.
 *
 * @param {typeof import('vscode')} editor - The editor API.
 * @param {import('vscode').TextDocument} document - The open editor document.
 * @param {import('vscode').Position} position - The completion cursor position.
 * @returns {import('vscode').CompletionItem[] | undefined} Completion items when the cursor is eligible.
 */
function provideCompletionItems(editor, document, position) {
  if (
    !editor.workspace.getConfiguration('cssxIntelliSense').get('suggestions', true) ||
    !isCssxString(document, position, editor)
  ) {
    return undefined;
  }
  const range = document.getWordRangeAtPosition(position, /[^\s'"`]+/) ?? new editor.Range(position, position);
  const partial = document.getText(range);
  const separatorIndex = partial.lastIndexOf(':');
  const variantPrefix = separatorIndex === -1 ? '' : partial.slice(0, separatorIndex + 1);
  const utilityPrefix = partial.slice(variantPrefix.length);
  return entries(utilityPrefix).map(createCompletionItem.bind(null, editor, range, variantPrefix));
}

module.exports = { provideCompletionItems };
