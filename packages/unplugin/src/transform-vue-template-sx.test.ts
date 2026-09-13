import { createClassNameAllocator, serializeCss } from '@cssxio/compiler';
import { expect, it } from 'vitest';

import { transformCssxModule } from './transform';
import { transformVueTemplateSx } from './transform-vue-template-sx';

it('transforms static template calls with compiled styles and source locations', async () => {
  const source = '<div :class="sx(\'p-4\')"></div>';
  const result = await transformVueTemplateSx(
    source,
    '/project/App.vue',
    {},
    createClassNameAllocator(),
    transformCssxModule,
  );

  expect(result?.code).not.toContain('sx(');
  expect(result?.rules).toHaveLength(1);
  expect(serializeCss(result?.rules ?? [])).toContain('padding:calc(0.25rem * 4)');
  expect(result?.origins['p-4']).toEqual({ line: 0, column: source.indexOf('sx(') });
});

it('returns null when the template contains no static sx call', async () => {
  await expect(
    transformVueTemplateSx(
      '<div :class="classes"></div>',
      '/project/App.vue',
      {},
      createClassNameAllocator(),
      transformCssxModule,
    ),
  ).resolves.toBeNull();
});
