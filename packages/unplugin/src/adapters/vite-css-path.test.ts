import { expect, it } from 'vitest';

import { viteCssPath } from './vite-css-path';

it('builds an absolute Vite CSS path', () => {
  expect(viteCssPath('/app/', 'assets/cssx.css')).toBe('/app/assets/cssx.css');
});

it('trims long slash runs from the base without altering interior separators', () => {
  const base = `${'/'.repeat(10_000)}app/nested${'/'.repeat(10_000)}`;
  expect(viteCssPath(base, 'assets/cssx.css')).toBe('/app/nested/assets/cssx.css');
  expect(viteCssPath('////', 'assets/cssx.css')).toBe('//assets/cssx.css');
});
