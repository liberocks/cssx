'use strict';
/* eslint-disable @typescript-eslint/no-require-imports */

/** Finds CSSX string utilities and their source ranges. */
const { cssxTokens } = require('./is-cssx-string');
/** Checks the compiler-generated built-in utility catalog. */
const { isKnownUtilityForDiagnostics } = require('./catalog-documentation');

/**
 * Produces warnings for sx() tokens not listed in the built-in utility catalog.
 *
 * @param {typeof import('vscode')} editor - The editor API.
 * @param {import('vscode').TextDocument} document - The open source document.
 * @returns {import('vscode').Diagnostic[]} Warnings for unexpected utility tokens.
 */
function provideDiagnostics(editor, document) {
  return cssxTokens(document, editor)
    .filter(({ isSxCall, token }) => isSxCall && !isKnownUtilityForDiagnostics(token))
    .map(({ range, token }) => {
      const diagnostic = new editor.Diagnostic(
        range,
        `CSSX does not list "${token}" in its built-in utility catalog. It will pass through without CSS; check its spelling or active theme.`,
        editor.DiagnosticSeverity.Warning,
      );
      diagnostic.source = 'CSSX';
      return diagnostic;
    });
}

module.exports = { provideDiagnostics };
