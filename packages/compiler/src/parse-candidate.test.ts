import { expect, it } from 'vitest';
import { parseCandidate } from './parse-candidate';

it('parses variants, importance, and negation independently', () => {
  expect(parseCandidate('hover:sm:!-mt-2')).toEqual({
    raw: 'hover:sm:!-mt-2',
    variants: ['sm', 'hover'],
    utility: 'mt-2',
    important: true,
    negative: true,
  });
  expect(() => parseCandidate('!!p-2')).toThrow('Invalid utility');
});
