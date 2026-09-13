import { expect, it } from 'vitest';
import { resolveCssFileName } from './resolve-css-file-name';

it('replaces filename hash markers', () => {
  expect(resolveCssFileName('assets/[hash].css', 'body{}')).toMatch(/^assets\/[a-z0-9]+\.css$/);
});
