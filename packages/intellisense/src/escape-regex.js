'use strict';

/**
 * Escapes text that will be used in a regular expression.
 *
 * @param {string} value - Text to escape.
 * @returns {string} The escaped text.
 */
function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { escapeRegex };
