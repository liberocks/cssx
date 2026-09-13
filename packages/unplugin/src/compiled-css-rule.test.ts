import { expect, it } from 'vitest';
import { compiledCssRule } from './compiled-css-rule';

it('creates a stable stylesheet rule name from the compiled CSS', () => {
  expect(compiledCssRule('.cssx { color: red; }')).toEqual({
    className: 'cssx-1ltfkwv',
    css: '.cssx { color: red; }',
  });
  expect(compiledCssRule('.cssx { color: red; }')).toEqual(compiledCssRule('.cssx { color: red; }'));
});
