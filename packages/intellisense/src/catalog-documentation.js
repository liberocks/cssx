'use strict';

/** Static values used to resolve utility help text. */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { EXACT, RECIPES } = require('./catalog-data');

/**
 * Gets short help text for one utility.
 *
 * @param {string} candidate - A CSSX utility string.
 * @returns {string | null} Help text, or null when the utility is unknown.
 */
function documentation(candidate) {
  const base = candidate.split(':').at(-1).replace(/^!|-$/g, '');
  const exact = EXACT.includes(base);
  const recipe = RECIPES.find(([prefix]) => base.startsWith(prefix));
  return exact
    ? `**${base}** — CSSX utility.`
    : recipe
      ? `**${base}** — ${recipe[1]} utility. Values are resolved during compilation.`
      : null;
}

module.exports = { documentation };
