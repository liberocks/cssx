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
      if (!range) {
        return undefined;
      }
      const text = document.getText(range);
      const detail = documentation(text);
      return detail ? new vscode.Hover(new vscode.MarkdownString(detail), range) : undefined;
    },
  });

  context.subscriptions.push(provider, hover);
}

/**
 * Checks whether the cursor is inside a CSSX utility string.
 *
 * @param {import('vscode').TextDocument} document - The open editor document.
 * @param {import('vscode').Position} position - The cursor position.
 * @returns {boolean} True when CSSX suggestions can be shown.
 */
function isCssxString(document, position) {
  const line = document.lineAt(position.line).text.slice(0, position.character);
  const configured = vscode.workspace.getConfiguration('cssxIntelliSense').get('classFunctions', []);
  const functions = ['cssx.create', 'cssx.sx', 'sx', ...configured].map(escapeRegex).join('|');
  return (
    new RegExp(`(?:${functions})\\s*\\([^\\n]*['\"\`][^'\"\`]*$`).test(line) ||
    /\b(?:class|className)\s*=\s*['"`][^'"`]*$/.test(line)
  );
}

/**
 * Escapes text that will be used in a regular expression.
 *
 * @param {string} value - Text to escape.
 * @returns {string} The escaped text.
 */
function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Stops CSSX editor support.
 *
 * @returns {void} Nothing.
 */
function deactivate() {}

module.exports = { activate, deactivate };
