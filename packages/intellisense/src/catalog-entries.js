'use strict';

/** Static values combined into completion entries. */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { EXACT, RECIPES, VARIANTS } = require('./catalog-data');

/**
 * Gets completion entries that start with a prefix.
 *
 * @param {string} prefix - Text already typed by the user.
 * @returns {{label: string, detail: string}[]} Matching completion entries.
 */
function entries(prefix) {
  const items = EXACT.map((label) => ({ label, detail: 'CSSX utility' }))
    .concat(RECIPES.map(([label, detail]) => ({ label, detail: `${detail} utility family` })))
    .concat(VARIANTS.map((label) => ({ label, detail: 'CSSX variant' })));
  return items.filter((item) => item.label.startsWith(prefix));
}

module.exports = { entries };
