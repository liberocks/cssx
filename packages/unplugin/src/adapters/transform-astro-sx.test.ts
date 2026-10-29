import { serializeCss } from '@cssxio/compiler';
import { expect, it } from 'vitest';

import { transformCssxModule } from '../transforms/transform';
import { transformAstroSxModule } from './transform-astro-sx';

it('transforms embedded Astro expressions and collects their CSS', async () => {
  const source = '<div class={sx("p-4")}></div><p class={sx("font-bold")}></p>';
  const result = await transformAstroSxModule(source, '/project/page.astro', {}, transformCssxModule);

  expect(result?.code).not.toContain('sx(');
  expect(result?.rules).toHaveLength(2);
  expect(serializeCss(result?.rules ?? [])).toContain('padding:calc(0.25rem * 4)');
  expect(serializeCss(result?.rules ?? [])).toContain('font-weight:700');
});

it('returns null when an Astro component has no CSSX calls', async () => {
  await expect(
    transformAstroSxModule('<div class="p-4"></div>', '/project/page.astro', {}, transformCssxModule),
  ).resolves.toBeNull();
});

it('collects Astro metadata without compiling discarded module CSS', async () => {
  const result = await transformAstroSxModule(
    '<div class={sx("p-4")}></div>',
    '/project/page.astro',
    { stableClassNames: true },
    transformCssxModule,
    { compileCss: false },
  );

  expect(result?.rules).toEqual([]);
  expect(result?.candidates).toHaveProperty('p-4');
});
