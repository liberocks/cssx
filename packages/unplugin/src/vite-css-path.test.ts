import { expect, it } from 'vitest';

import { viteCssPath } from './vite-css-path';

it('builds an absolute Vite CSS path', () => {
  expect(viteCssPath('/app/', 'assets/cssx.css')).toBe('/app/assets/cssx.css');
});
