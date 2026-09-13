'use strict';
/* eslint-disable @typescript-eslint/no-require-imports */

/** Completion callback. */
const { provideCompletionItems } = require('./provide-completion-items');
/** Hover callback. */
const { provideHover } = require('./provide-hover');
/** Editor API loader. */
const { loadEditorApi } = require('./load-editor-api');

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
    { provideCompletionItems: provideCompletionItems.bind(null, editor) },
    ' ',
    ':',
    '-',
    '[',
    '/',
  );
  const hover = editor.languages.registerHoverProvider(LANGUAGE_SELECTOR, {
    provideHover: provideHover.bind(null, editor),
  });
  context.subscriptions.push(provider, hover);
}

module.exports = { activate };
