'use strict';
/* eslint-disable @typescript-eslint/no-require-imports */

/** Completion catalog lookup. */
const { entries } = require('./catalog');
/** Completion item factory. */
const { createCompletionItem } = require('./create-completion-item');
/** CSSX string detector. */
const { cssxTokenAt } = require('./is-cssx-string');

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

  const separatorIndex = lastVariantSeparator(current.token);
  const variantPrefix = separatorIndex === -1 ? '' : current.token.slice(0, separatorIndex + 1);
  const utilityPrefix = current.token.slice(variantPrefix.length);
  return entries(utilityPrefix).map(createCompletionItem.bind(null, editor, current.range, variantPrefix));
}

/** Finds the final variant separator outside arbitrary bracket syntax. */
function lastVariantSeparator(candidate) {
  let depth = 0;
  let separator = -1;
  for (let index = 0; index < candidate.length; index += 1) {
    if (candidate[index] === '[') {
      depth += 1;
    } else if (candidate[index] === ']') {
      depth = Math.max(0, depth - 1);
    } else if (candidate[index] === ':' && depth === 0) {
      separator = index;
    }
  }
  return separator;
}

module.exports = { provideCompletionItems };
