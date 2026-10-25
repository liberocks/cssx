'use strict';
/* eslint-disable @typescript-eslint/no-require-imports */

/** Generated and authored completion entries. */
const { ALL_ENTRIES } = require('./catalog-entries');
/** Static value families provide details for arbitrary values. */
const { RECIPES } = require('./catalog-data');
/** Shared bracket, parenthesis, quote, and escape aware candidate scanner. */
const { lastTopLevelSeparator } = require('./candidate-syntax');

/** Lookup used by hover and completion documentation. */
const ENTRY_BY_LABEL = new Map(ALL_ENTRIES.map((entry) => [entry.label, entry]));

/**
 * Gets short help text for one utility.
 *
 * @param {string} candidate - A CSSX utility string.
 * @returns {string | null} Help text, or null when the utility is unknown.
 */
function documentation(candidate) {
  const utility = stripVariants(candidate).replace(/^!/, '').replace(/^-/, '');
  const entry = ENTRY_BY_LABEL.get(utility);
  if (entry) {
    const color = entry.colorHex ? ` — ${entry.colorHex}` : '';
    return `**${utility}** — ${entry.detail}${color}.`;
  }
  const recipe = RECIPES.find(([prefix]) => utility.startsWith(prefix));
  return recipe ? `**${utility}** — ${recipe[1]} utility. Values are resolved during compilation.` : null;
}

/**
 * Removes variant prefixes while respecting colons inside arbitrary values.
 *
 * @param {string} candidate - Complete utility candidate.
 * @returns {string} Candidate utility without variants.
 */
function stripVariants(candidate) {
  const separator = lastTopLevelSeparator(candidate, ':');
  return candidate.slice(separator + 1);
}

module.exports = { documentation, stripVariants };
