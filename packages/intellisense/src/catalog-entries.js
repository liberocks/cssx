'use strict';
/* eslint-disable @typescript-eslint/no-require-imports */

/** Generated catalog built from the CSSX compiler corpus and default theme. */
const CATALOG = require('../catalog-generated.json');
/** Additional family prefixes and variants without finite values. */
const { EXACT, RECIPES, VARIANTS } = require('./catalog-data');

/** Utility prefixes whose values are CSS colors. */
const COLOR_FAMILIES = [
  'scrollbar-thumb-',
  'scrollbar-track-',
  'ring-offset-',
  'placeholder-',
  'decoration-',
  'border-be-',
  'border-bs-',
  'border-x-',
  'border-y-',
  'border-t-',
  'border-r-',
  'border-b-',
  'border-l-',
  'border-s-',
  'border-e-',
  'border-',
  'divide-',
  'outline-',
  'accent-',
  'caret-',
  'stroke-',
  'fill-',
  'ring-',
  'from-',
  'via-',
  'to-',
  'text-',
  'bg-',
].sort((left, right) => right.length - left.length);

/** Concrete color utilities get dedicated swatches. */
const colorEntries = Object.keys(CATALOG.colors).flatMap((color) =>
  COLOR_FAMILIES.map((family) => ({
    label: `${family}${color}`,
    detail: `${family.slice(0, -1)} color`,
    colorHex: CATALOG.colors[color],
  })),
);
/** Deduplicated label lookup, with finite candidates preferred over families. */
const entriesByLabel = new Map();
for (const label of [...CATALOG.candidates, ...EXACT]) {
  entriesByLabel.set(label, { label, detail: 'CSSX utility', colorHex: colorForCandidate(label) });
}
for (const [label, detail] of RECIPES) {
  entriesByLabel.set(label, { label, detail: `${detail} utility family` });
}
for (const entry of colorEntries) {
  entriesByLabel.set(entry.label, entry);
}
for (const label of new Set([...VARIANTS, ...CATALOG.candidates.filter((candidate) => candidate.endsWith(':'))])) {
  entriesByLabel.set(label, { label, detail: 'CSSX variant' });
}
/** Stable, alphabetically sorted catalog used for every completion request. */
const ALL_ENTRIES = [...entriesByLabel.values()].sort((left, right) => left.label.localeCompare(right.label));

/**
 * Gets completion entries that start with a prefix.
 *
 * @param {string} prefix - Text already typed by the user.
 * @returns {{label: string, detail: string, colorHex?: string}[]} Matching completion entries.
 */
function entries(prefix) {
  return ALL_ENTRIES.filter((item) => item.label.startsWith(prefix));
}

/**
 * Resolves a built-in color for a complete candidate utility.
 *
 * @param {string} candidate - Utility without its variants.
 * @returns {string | undefined} Hex color, including alpha when present.
 */
function colorForCandidate(candidate) {
  const modifier = candidate.lastIndexOf('/');
  const opacity = modifier === -1 ? undefined : parseOpacity(candidate.slice(modifier + 1));
  const utility = modifier === -1 ? candidate : candidate.slice(0, modifier);
  const family = COLOR_FAMILIES.find((prefix) => utility.startsWith(prefix));
  if (!family) {
    return undefined;
  }
  const hex = CATALOG.colors[utility.slice(family.length)];
  if (!hex) {
    return undefined;
  }
  if (opacity === undefined) {
    return hex;
  }
  const rgb = hex.slice(1, 7);
  const baseAlpha = hex.length === 9 ? Number.parseInt(hex.slice(7), 16) / 255 : 1;
  return `#${rgb}${Math.round(baseAlpha * opacity * 255)
    .toString(16)
    .padStart(2, '0')}`;
}

/** Converts a slash opacity value to its unit interval representation. */
function parseOpacity(value) {
  if (/^\d+(?:\.\d+)?$/.test(value)) {
    const numeric = Number(value);
    return numeric > 1 ? numeric / 100 : numeric;
  }
  const arbitrary = /^\[(\d*\.?\d+)\]$/.exec(value)?.[1];
  return arbitrary === undefined ? undefined : Number(arbitrary);
}

module.exports = { ALL_ENTRIES, CATALOG, COLOR_FAMILIES, colorForCandidate, entries };
