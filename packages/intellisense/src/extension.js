'use strict';
/* eslint-disable @typescript-eslint/no-require-imports */

/** Loads the editor extension API. */
const vscode = require('vscode');
/** Provides utility completions and hover text. */
const { entries, documentation } = require('./catalog');

/** Lists source languages that can contain CSSX utility strings. */
const LANGUAGE_SELECTOR = [
  'javascript',
  'typescript',
  'javascriptreact',
  'typescriptreact',
  'html',
  'astro',
  'vue',
  'svelte',
];

/**
 * Starts CSSX editor support.
 *
 * @param {import('vscode').ExtensionContext} context - The editor extension context.
 * @returns {void} Nothing.
 */
function activate(context) {
  const provider = vscode.languages.registerCompletionItemProvider(
    LANGUAGE_SELECTOR,
    {
      provideCompletionItems(document, position) {
        if (
          !vscode.workspace.getConfiguration('cssxIntelliSense').get('suggestions', true) ||
          !isCssxString(document, position)
        ) {
          return undefined;
        }
        const range = document.getWordRangeAtPosition(position, /[^\s'"`]+/) ?? new vscode.Range(position, position);
        const partial = document.getText(range);
        const variantPrefix = partial.lastIndexOf(':') === -1 ? '' : partial.slice(0, partial.lastIndexOf(':') + 1);
        const utilityPrefix = partial.slice(variantPrefix.length);
        return entries(utilityPrefix).map((entry) => {
          const item = new vscode.CompletionItem(
            `${variantPrefix}${entry.label}`,
            entry.label.endsWith(':') ? vscode.CompletionItemKind.Keyword : vscode.CompletionItemKind.Value,
          );
          item.insertText = `${variantPrefix}${entry.label}`;
          item.range = range;
          item.detail = entry.detail;
          item.documentation = new vscode.MarkdownString(
            documentation(`${variantPrefix}${entry.label}`) ?? entry.detail,
          );
          return item;
        });
      },
    },
    ' ',
    ':',
    '-',
    '[',
    '/',
  );

  const hover = vscode.languages.registerHoverProvider(LANGUAGE_SELECTOR, {
    provideHover(document, position) {
      if (!isCssxString(document, position)) {
        return undefined;
      }
      const range = document.getWordRangeAtPosition(position, /[^\s'"`]+/);
