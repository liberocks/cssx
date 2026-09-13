'use strict';
/* eslint-disable @typescript-eslint/no-require-imports */

/** Utility help-text lookup. */
const { documentation } = require('./catalog');

/**
 * Builds one editor completion item for a catalog entry.
 *
 * @param {typeof import('vscode')} editor - The editor API.
 * @param {import('vscode').Range} range - The text range replaced by completion.
 * @param {string} variantPrefix - Variant text that must remain before the utility.
 * @param {{label: string, detail: string}} entry - Catalog entry to render.
 * @returns {import('vscode').CompletionItem} The populated completion item.
 */
function createCompletionItem(editor, range, variantPrefix, entry) {
  const item = new editor.CompletionItem(
    `${variantPrefix}${entry.label}`,
    entry.label.endsWith(':') ? editor.CompletionItemKind.Keyword : editor.CompletionItemKind.Value,
  );
  item.insertText = `${variantPrefix}${entry.label}`;
  item.range = range;
  item.detail = entry.detail;
  item.documentation = new editor.MarkdownString(documentation(`${variantPrefix}${entry.label}`) ?? entry.detail);
  return item;
}

module.exports = { createCompletionItem };
