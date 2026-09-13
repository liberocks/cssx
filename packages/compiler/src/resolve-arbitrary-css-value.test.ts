import { expect, it } from 'vitest';
import { resolveArbitraryCssValue } from './resolve-arbitrary-css-value';

it('decodes bracket and custom-property shorthand values', () => {
  expect(resolveArbitraryCssValue('[hello_world\\_name]')).toBe('hello world_name');
  expect(resolveArbitraryCssValue('(--size)')).toBe('var(--size)');
});
