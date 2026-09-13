import { expect, it } from 'vitest';
import { readThemeModifier } from './read-theme-modifier';

it('reads supported theme output modes and prefixes', () => {
  expect(readThemeModifier('static {', 0)).toEqual({ mode: 'static', prefix: '', end: 6 });
  expect(readThemeModifier('prefix(app) {', 0)).toEqual({ mode: 'reference', prefix: 'app', end: 11 });
  expect(readThemeModifier('{', 0)).toBeNull();
});
