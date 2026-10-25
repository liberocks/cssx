import { expect, it } from 'vitest';

import { resolveArbitraryCssValue } from './resolve-arbitrary-css-value';

it('decodes whitespace aliases and explicit literal underscores', () => {
  expect(resolveArbitraryCssValue('[hello_world\\_name]')).toBe('hello world_name');
  expect(resolveArbitraryCssValue('["hello_world"]')).toBe('"hello world"');
  expect(resolveArbitraryCssValue('[calc(100vw_-_2rem)]')).toBe('calc(100vw - 2rem)');
});

it('preserves underscores in URL payloads and variable/environment names', () => {
  expect(resolveArbitraryCssValue('[url(/assets/hero_image.svg)]')).toBe('url(/assets/hero_image.svg)');
  expect(resolveArbitraryCssValue('[url("hero_image.svg")]')).toBe('url("hero_image.svg")');
  expect(resolveArbitraryCssValue('[var(--size_token, 1rem_+_2px)]')).toBe('var(--size_token, 1rem + 2px)');
  expect(resolveArbitraryCssValue('[env(safe_area_inset_top)]')).toBe('env(safe_area_inset_top)');
});

it('handles nested functions, escapes, and malformed protected functions', () => {
  expect(resolveArbitraryCssValue('[steps(4,_end)]')).toBe('steps(4, end)');
  expect(resolveArbitraryCssValue('["escaped\\"_word"]')).toBe('"escaped\\" word"');
  expect(resolveArbitraryCssValue('[var(--size_token, rgb(1_2_3))]')).toBe('var(--size_token, rgb(1 2 3))');
  expect(resolveArbitraryCssValue('[var(--size_token]')).toBe('var(--size_token');
  expect(resolveArbitraryCssValue('( --size\\_token )')).toBe('var( --size_token )');
});
