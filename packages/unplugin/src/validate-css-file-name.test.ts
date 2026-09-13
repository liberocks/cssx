import { expect, it } from 'vitest';

import { validateCssFileName } from './validate-css-file-name';

it('accepts safe relative CSS paths', () => {
  expect(validateCssFileName('assets/cssx.css')).toBe('assets/cssx.css');
  expect(() => validateCssFileName('../escape.css')).toThrow('must not escape');
});
