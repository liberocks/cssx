import { expect, it } from 'vitest';
import { wrapCssLayer } from './wrap-css-layer';

it('wraps nonempty CSS when a layer is configured', () => {
  expect(wrapCssLayer('.button{color:red}', 'utilities')).toBe('@layer utilities{.button{color:red}}');
});

it('preserves CSS when no layer is configured or the stylesheet is empty', () => {
  expect(wrapCssLayer('.button{color:red}', undefined)).toBe('.button{color:red}');
  expect(wrapCssLayer('', 'utilities')).toBe('');
});
