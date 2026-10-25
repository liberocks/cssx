'use strict';

/** Finds top-level spaces or one top-level character in a CSSX candidate. */
function scanSeparators(candidate, separator) {
  const separators = [];
  let bracketDepth = 0;
  let parenthesisDepth = 0;
  let quote = '';
  let escaped = false;

  for (let index = 0; index < candidate.length;) {
    const codePoint = candidate.codePointAt(index);
    const character = String.fromCodePoint(codePoint);
    const width = character.length;

    if (escaped) {
      escaped = false;
      index += width;
      continue;
    }
    if (character === '\\') {
      escaped = true;
      index += width;
      continue;
    }
    if (quote) {
      if (character === quote) {
        quote = '';
      }
      index += width;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      index += width;
      continue;
    }
    if (character === '[') {
      bracketDepth += 1;
    } else if (character === ']') {
      bracketDepth = Math.max(0, bracketDepth - 1);
    } else if (character === '(') {
      parenthesisDepth += 1;
    } else if (character === ')') {
      parenthesisDepth = Math.max(0, parenthesisDepth - 1);
    }

    const isSeparator = separator === null ? /\s/u.test(character) : character === separator;
    if (isSeparator && bracketDepth === 0 && parenthesisDepth === 0) {
      separators.push({ index, length: width });
    }
    index += width;
  }

  return separators;
}

/** Splits a candidate at top-level whitespace and retains an unfinished final token. */
function splitCandidateRanges(candidate) {
  const ranges = [];
  let start = 0;
  for (const separator of scanSeparators(candidate, null)) {
    if (separator.index > start) {
      ranges.push({ start, end: separator.index });
    }
    start = separator.index + separator.length;
  }
  if (start < candidate.length) {
    ranges.push({ start, end: candidate.length });
  }
  return ranges;
}

/** Finds the final top-level separator in a candidate. */
function lastTopLevelSeparator(candidate, separator) {
  const separators = scanSeparators(candidate, separator);
  return separators.length === 0 ? -1 : separators[separators.length - 1].index;
}

module.exports = { lastTopLevelSeparator, scanSeparators, splitCandidateRanges };
