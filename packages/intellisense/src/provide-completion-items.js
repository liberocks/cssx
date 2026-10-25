'use strict';
/* eslint-disable @typescript-eslint/no-require-imports */

/** Completion catalog lookup. */
const { entries } = require('./catalog');
/** Completion item factory. */
const { createCompletionItem } = require('./create-completion-item');
/** CSSX string detector. */
const { cssxTokenAt } = require('./is-cssx-string');
/** Shared bracket, parenthesis, quote, and escape aware candidate scanner. */
const { lastTopLevelSeparator } = require('./candidate-syntax');

/**
 * Produces utility completions at the current editor position.
 *
 * @param {typeof import('vscode')} editor - The editor API.
 * @param {import('vscode').TextDocument} document - The open editor document.
 * @param {import('vscode').Position} position - The completion cursor position.
 * @returns {import('vscode').CompletionItem[] | undefined} Completion items when the cursor is eligible.
 */
function provideCompletionItems(editor, document, position) {
  if (!editor.workspace.getConfiguration('cssxIntelliSense').get('suggestions', true)) {
    return undefined;
  }
  const current = cssxTokenAt(document, position, editor);
  if (!current) {
    return undefined;
  }

  const separatorIndex = lastTopLevelSeparator(current.token, ':');
  const variantPrefix = separatorIndex === -1 ? '' : current.token.slice(0, separatorIndex + 1);
  const utilityPrefix = current.token.slice(variantPrefix.length);
  const sourcePrefixEnd =
    separatorIndex === -1 ? current.start : current.sourceOffsets[current.logicalStart + separatorIndex + 1];
  const rawVariantPrefix = current.rawToken.slice(0, sourcePrefixEnd - current.start);
  return entries(utilityPrefix).map((entry) =>
    createCompletionItem(editor, current.range, variantPrefix, entry, rawVariantPrefix),
  );
}

module.exports = { provideCompletionItems };
