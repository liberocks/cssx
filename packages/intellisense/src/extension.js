'use strict';
/* eslint-disable @typescript-eslint/no-require-imports */

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
 * @param {typeof import('vscode')} [editor] - The editor API used to register providers.
 * @returns {void} Nothing.
 */
function activate(context, editor = loadEditorApi()) {
  const provider = editor.languages.registerCompletionItemProvider(
    LANGUAGE_SELECTOR,
    {
      provideCompletionItems(document, position) {
        if (
          !editor.workspace.getConfiguration('cssxIntelliSense').get('suggestions', true) ||
          !isCssxString(document, position, editor)
        ) {
          return undefined;
        }
        const range = document.getWordRangeAtPosition(position, /[^\s'"`]+/) ?? new editor.Range(position, position);
        const partial = document.getText(range);
        const variantPrefix = partial.lastIndexOf(':') === -1 ? '' : partial.slice(0, partial.lastIndexOf(':') + 1);
        const utilityPrefix = partial.slice(variantPrefix.length);
        return entries(utilityPrefix).map((entry) => {
          const item = new editor.CompletionItem(
            `${variantPrefix}${entry.label}`,
            entry.label.endsWith(':') ? editor.CompletionItemKind.Keyword : editor.CompletionItemKind.Value,
          );
          item.insertText = `${variantPrefix}${entry.label}`;
          item.range = range;
          item.detail = entry.detail;
          item.documentation = new editor.MarkdownString(
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

  const hover = editor.languages.registerHoverProvider(LANGUAGE_SELECTOR, {
    provideHover(document, position) {
      if (!isCssxString(document, position, editor)) {
        return undefined;
      }
      const range = document.getWordRangeAtPosition(position, /[^\s'"`]+/);
      if (!range) {
        return undefined;
      }
      const text = document.getText(range);
      const detail = documentation(text);
      return detail ? new editor.Hover(new editor.MarkdownString(detail), range) : undefined;
    },
  });

  context.subscriptions.push(provider, hover);
}

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

/** Loads the editor extension API only when the extension is activated. */
function loadEditorApi(load = require) {
  return load('vscode');
}

/**
 * Stops CSSX editor support.
 *
 * @returns {void} Nothing.
 */
function deactivate() {}

module.exports = { activate, deactivate, loadEditorApi };
