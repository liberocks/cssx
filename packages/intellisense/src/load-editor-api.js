'use strict';

/**
 * Loads the editor extension API only when the extension is activated.
 *
 * @param {(name: string) => unknown} [load] - Module loader, injectable for tests.
 * @returns {unknown} The host editor API.
 */
function loadEditorApi(load = require) {
  return load('vscode');
}

module.exports = { loadEditorApi };
