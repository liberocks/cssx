import { expect, it } from 'vitest';

import {
  MAX_CANDIDATE_COUNT,
  MAX_NESTING_DEPTH,
  MAX_STYLE_MAP_ENTRIES,
  MAX_UTILITY_LIST_LENGTH,
} from './candidate-limits';

it('keeps parsing and compilation resource ceilings explicit', () => {
  expect({ MAX_UTILITY_LIST_LENGTH, MAX_NESTING_DEPTH, MAX_STYLE_MAP_ENTRIES, MAX_CANDIDATE_COUNT }).toEqual({
    MAX_UTILITY_LIST_LENGTH: 16_384,
    MAX_NESTING_DEPTH: 32,
    MAX_STYLE_MAP_ENTRIES: 10_000,
    MAX_CANDIDATE_COUNT: 50_000,
  });
});
