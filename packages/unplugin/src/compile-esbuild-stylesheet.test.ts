import { expect, it } from 'vitest';

import { compileEsbuildStylesheet } from './compile-esbuild-stylesheet';

it('compiles canonical module records using esbuild theme and output options', async () => {
  const stylesheet = await compileEsbuildStylesheet(
    [['/project/app.tsx', { id: '/project/app.tsx', candidates: { 'p-4': 'padding' } }]],
    { preflight: false, sourceMap: false, layer: 'utilities' },
  );

  expect(stylesheet.css).toContain('@layer utilities{');
  expect(stylesheet.css).toContain('.padding{padding:calc(0.25rem * 4);}');
  expect(stylesheet.map).toBeUndefined();
});
