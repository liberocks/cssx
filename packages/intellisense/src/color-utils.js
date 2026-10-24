'use strict';

/* eslint-disable @typescript-eslint/no-require-imports */
/** Complete CSSX color palette. */
const { CATALOG, COLOR_FAMILIES } = require('./catalog-entries');
/** Candidate variant parser. */
const { stripVariants } = require('./catalog-documentation');

/**
 * Resolves one utility's color and the prefix needed to present a color picker edit.
 *
 * @param {string} candidate - Utility candidate, with optional variants.
 * @returns {{hex: string, prefix: string, variant: string} | undefined} Resolved color data.
 */
function parseColorCandidate(candidate) {
  const variant = candidate.slice(0, candidate.length - stripVariants(candidate).length);
  let utility = stripVariants(candidate);
  const important = utility.startsWith('!') ? '!' : '';
  utility = utility.slice(important.length);
  const negative = utility.startsWith('-') ? '-' : '';
  utility = utility.slice(negative.length);
  const modifier = utility.lastIndexOf('/');
  const opacity = modifier === -1 ? undefined : parseOpacity(utility.slice(modifier + 1));
  if (modifier !== -1) {
    utility = utility.slice(0, modifier);
  }
  const family = COLOR_FAMILIES.find((prefix) => utility.startsWith(prefix));
  if (!family) {
    return undefined;
  }
  const colorName = utility.slice(family.length);
  const arbitrary = /^\[(#[\da-f]{3,8})\]$/i.exec(colorName)?.[1];
  const hex = arbitrary ? normalizeHex(arbitrary) : CATALOG.colors[colorName];
  if (!hex) {
    return undefined;
  }
  const rgba = hexToRgba(hex);
  if (!rgba) {
    return undefined;
  }
  if (opacity !== undefined) {
    rgba[3] *= opacity;
  }
  const resolvedHex = rgbaToHex(rgba);
  return { hex: resolvedHex, prefix: `${variant}${important}${negative}${family}`, variant };
}

/**
 * Converts a hex color to normalized RGBA channels.
 *
 * @param {string} hex - Hex color.
 * @returns {[number, number, number, number] | undefined} RGBA channels.
 */
function hexToRgba(hex) {
  const normalized = normalizeHex(hex);
  if (!normalized) {
    return undefined;
  }
  const digits = normalized.slice(1);
  return [
    Number.parseInt(digits.slice(0, 2), 16) / 255,
    Number.parseInt(digits.slice(2, 4), 16) / 255,
    Number.parseInt(digits.slice(4, 6), 16) / 255,
    digits.length === 8 ? Number.parseInt(digits.slice(6, 8), 16) / 255 : 1,
  ];
}

/** Converts normalized RGBA channels to CSS hexadecimal notation. */
function rgbaToHex(rgba) {
  const channels = rgba.slice(0, 3).map((channel) =>
    Math.round(channel * 255)
      .toString(16)
      .padStart(2, '0'),
  );
  const alpha = Math.round(rgba[3] * 255);
  return `#${channels.join('')}${alpha < 255 ? alpha.toString(16).padStart(2, '0') : ''}`;
}

/** Expands shorthand CSS hex colors to six or eight digits. */
function normalizeHex(hex) {
  const match = /^#([\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i.exec(hex);
  if (!match) {
    return undefined;
  }
  const digits = match[1].toLowerCase();
  return `#${digits.length === 3 || digits.length === 4 ? [...digits].map((x) => x + x).join('') : digits}`;
}

/** Converts a CSSX slash modifier to an alpha multiplier. */
function parseOpacity(value) {
  const arbitrary = /^\[(\d*\.?\d+)(%)?\]$/.exec(value);
  if (arbitrary) {
    return Math.min(1, Number(arbitrary[1]) / (arbitrary[2] ? 100 : 1));
  }
  if (!/^\d+(?:\.\d+)?$/.test(value)) {
    return undefined;
  }
  const numeric = Number(value);
  return Math.min(1, numeric > 1 ? numeric / 100 : numeric);
}

module.exports = { hexToRgba, normalizeHex, parseColorCandidate };
