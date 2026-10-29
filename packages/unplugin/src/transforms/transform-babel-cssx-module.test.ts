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

it('collects development metadata without compiling per-module CSS and keeps style aliases stable', async () => {
  const options = {
    stableClassNames: true,
    stableClassNameFileName: 'src/styles.ts',
    className: { variant: 'random' as const },
  };
  const before = await transformBabelCssxModule(
    `import { sx } from '@cssxio/cssx'; export const className = sx('p-4');`,
    '/project/styles.ts',
    options,
    undefined,
    { compileCss: false },
  );
  const after = await transformBabelCssxModule(
    `import { sx } from '@cssxio/cssx'; export const className = sx('p-8');`,
    '/project/styles.ts',
    options,
    undefined,
    { compileCss: false },
  );

  expect(before.rules).toEqual([]);
  expect(after.rules).toEqual([]);
  expect(before.candidates).toHaveProperty('p-4');
  expect(after.candidates).toHaveProperty('p-8');
  expect(Object.keys(after.composites)).toEqual(Object.keys(before.composites));
});
