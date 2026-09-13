import { expect, it } from 'vitest';
import { skipThemeWhitespaceAndComments } from './skip-theme-whitespace-and-comments';

it('skips CSS whitespace and comments while rejecting unterminated comments', () => {
  expect(skipThemeWhitespaceAndComments(' \n/* note */@theme', 0)).toBe(12);
  expect(() => skipThemeWhitespaceAndComments('/* note', 0)).toThrow('Unterminated CSSX theme comment');
});
