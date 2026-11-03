'use strict';
/* eslint-disable @typescript-eslint/no-require-imports */

/** Completion callback. */
const { provideCompletionItems } = require('./provide-completion-items');
/** Hover callback. */
const { provideHover } = require('./provide-hover');
/** Source color callbacks. */
const { provideColorPresentations, provideDocumentColors } = require('./provide-color');
/** Editor API loader. */
const { loadEditorApi } = require('./load-editor-api');
/** Source diagnostics for unexpected sx() utilities. */
const { provideDiagnostics } = require('./provide-diagnostics');

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
    "'",
    '"',
    '`',
  );
  const hover = editor.languages.registerHoverProvider(LANGUAGE_SELECTOR, {
    provideHover: provideHover.bind(null, editor),
  });
  const color = editor.languages.registerColorProvider(LANGUAGE_SELECTOR, {
    provideDocumentColors: provideDocumentColors.bind(null, editor),
    provideColorPresentations: provideColorPresentations.bind(null, editor),
  });
  const diagnostics = editor.languages.createDiagnosticCollection('cssx');
  const updateDiagnostics = (document) => diagnostics.set(document.uri, provideDiagnostics(editor, document));
  for (const document of editor.workspace?.textDocuments ?? []) {
    updateDiagnostics(document);
  }
  const opened = editor.workspace?.onDidOpenTextDocument?.(updateDiagnostics);
  const changed = editor.workspace?.onDidChangeTextDocument?.(({ document }) => updateDiagnostics(document));
  const closed = editor.workspace?.onDidCloseTextDocument?.((document) => diagnostics.delete(document.uri));
  context.subscriptions.push(...[provider, hover, color, diagnostics, opened, changed, closed].filter(Boolean));
}

module.exports = { activate };
