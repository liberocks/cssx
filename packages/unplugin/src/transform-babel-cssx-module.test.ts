import { serializeCss } from '@cssxio/compiler';
import { expect, it } from 'vitest';

import { transformBabelCssxModule } from './transform-babel-cssx-module';

it('transforms JavaScript and compiles the CSSX utility rules', async () => {
  const result = await transformBabelCssxModule(
    `import { sx } from '@cssxio/cssx';\nexport const className = sx('p-4');`,
    '/project/styles.ts',
    {},
  );

  expect(result.code).not.toContain('@cssxio/cssx');
  expect(serializeCss(result.rules)).toContain('padding:calc(0.25rem * 4)');
  expect(result.candidates).toHaveProperty('p-4');
  expect(result.map).toBeDefined();
});

it('returns transformed modules without stylesheet rules when no utilities are collected', async () => {
  const result = await transformBabelCssxModule(
    `import { sx } from '@cssxio/cssx';\nexport const className = sx('');`,
    '/project/empty.ts',
    {},
  );

  expect(result.candidates).toEqual({});
  expect(result.rules).toEqual([]);
});
