import { expect, it } from 'vitest';

import { validateKeyframeBody } from './validate-keyframe-body';

it('accepts supported keyframe selectors and declarations', () => {
  expect(() =>
    validateKeyframeBody('from, 25.5% { opacity: 0; --custom-value: 1; } to { opacity: 1; }', 'fade'),
  ).not.toThrow();
  expect(() => validateKeyframeBody('/* empty body */', 'fade')).not.toThrow();
});

it('rejects invalid selectors, unterminated blocks, and malformed declarations', () => {
  expect(() => validateKeyframeBody('.active { opacity: 1; }', 'fade')).toThrow('Invalid CSSX @keyframes selector');
  expect(() => validateKeyframeBody('from', 'fade')).toThrow('Unterminated CSSX @keyframes');
  expect(() => validateKeyframeBody('to { opacity:; }', 'fade')).toThrow('Invalid CSSX @keyframes declaration');
});
