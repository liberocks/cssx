import { expect, it } from 'vitest';

import type { CssxRule } from './cssx-rule';
import { serializeCss } from './serialize-css';

const rules = ([css = []]: readonly (readonly string[])[]): readonly CssxRule[] =>
  css.map((value, index) => ({ className: `c${index}`, css: value }));

it('deduplicates and sorts unique rule CSS', () => {
  expect(serializeCss(rules([['.b{}', '.a{}', '.b{}', '.a{}']]))).toBe('.a{}.b{}');
});

it('wraps non-empty CSS in a CSS layer when requested', () => {
  expect(serializeCss(rules([['.a{}', '.b{}']]), { layer: 'utilities' })).toBe('@layer utilities{.a{}.b{}}');
});

it('does not wrap empty CSS in a layer', () => {
  expect(serializeCss([], { layer: 'utilities' })).toBe('');
  expect(serializeCss(rules([['', '']]), { layer: 'utilities' })).toBe('');
});

it('removes terminal declaration semicolons while preserving nested rule structure', () => {
  expect(serializeCss(rules([['.a{color:red;}.b{color:blue;}']]))).toBe('.a{color:red}.b{color:blue}');
  expect(serializeCss(rules([['@media(x){.a{color:red;}}']]))).toBe('@media(x){.a{color:red}}');
});

it('preserves semicolons inside strings, comments, and non-terminal declarations', () => {
  expect(serializeCss(rules([[`.a{content:";}";content:';\\\\';/* ;} */color:red;}`]]))).toBe(
    `.a{content:";}";content:';\\\\';/* ;} */color:red}`,
  );
});

it('keeps declaration semicolons when a closing brace does not follow', () => {
  expect(serializeCss(rules([['.a{color:red; /* gap */ }']]))).toBe('.a{color:red; /* gap */ }');
});
