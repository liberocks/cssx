import { serializeCss } from '@cssxio/compiler';
import { expect, it } from 'vitest';

import { transformCssxModule } from '../transforms/transform';
import { transformVueSfcModule } from './transform-vue-sfc';

it('combines script-setup and template CSSX metadata in the transformed SFC', async () => {
  const source = `<script setup lang="ts">\nimport { sx } from '@cssxio/cssx';\nconst title = sx('font-bold');\n</script>\n<template><h1 :class="sx('p-4')">Title</h1></template>`;
  const result = await transformVueSfcModule(source, '/project/App.vue?vue', {}, transformCssxModule);

  expect(result?.code).not.toContain("from '@cssxio/cssx'");
  expect(result?.code).toContain(':class="');
  expect(serializeCss(result?.rules ?? [])).toContain('font-weight:700');
  expect(serializeCss(result?.rules ?? [])).toContain('padding:calc(0.25rem * 4)');
  expect(Object.keys(result?.candidates ?? {}).sort()).toEqual(['font-bold', 'p-4']);
});

it('returns null for unused modules and templates without static calls', async () => {
  await expect(
    transformVueSfcModule(
      '<script setup>const value = 1;</script><template><div/></template>',
      '/project/Empty.vue',
      {},
      transformCssxModule,
    ),
  ).resolves.toBeNull();
  await expect(
    transformVueSfcModule('<template><div data-value="sx"/></template>', '/project/Empty.vue', {}, transformCssxModule),
  ).resolves.toBeNull();
});

it('reports Vue compiler parse errors', async () => {
  await expect(
    transformVueSfcModule('<template><div></template>', '/project/Broken.vue', {}, transformCssxModule),
  ).rejects.toThrow('Element is missing end tag');
});

it('collects Vue metadata without compiling discarded module CSS', async () => {
  const source = `<script setup>import { sx } from '@cssxio/cssx'; const title = sx('font-bold');</script><template><h1 :class="sx('p-4')" /></template>`;
  const result = await transformVueSfcModule(
    source,
    '/project/App.vue',
    { stableClassNames: true },
    transformCssxModule,
    { compileCss: false },
  );

  expect(result?.rules).toEqual([]);
  expect(result?.candidates).toHaveProperty('font-bold');
  expect(result?.candidates).toHaveProperty('p-4');
});
