import { expect, it } from 'vitest';

import { compileSourceUtilities } from './compile-source-utilities';

it('compiles source selectors with the supplied theme and variants', async () => {
  const result = await compileSourceUtilities(['sm:p-2', 'hover:bg-red-500'], '@theme { --spacing: 1rem; }');

  expect(result.classes).toEqual({ 'sm:p-2': 'sm:p-2', 'hover:bg-red-500': 'hover:bg-red-500' });
  expect(result.css).toContain('.sm\\:p-2');
  expect(result.css).toContain('@media (width >= 40rem)');
  expect(result.css).toContain('padding:calc(1rem * 2)');
  expect(result.css).toContain('.hover\\:bg-red-500:hover');
});
