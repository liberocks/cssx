import { serializeCss } from '@cssxio/compiler';
import { expect, it } from 'vitest';
import { transformCssxModule } from './transform-cssx-module';

it('compiles CSSX source into transformed JavaScript and utility rules', async () => {
  const result = await transformCssxModule(
    `import { sx } from '@cssxio/cssx';\nexport const className = sx('p-4');`,
    '/project/styles.ts',
  );

  expect(result?.code).not.toContain('@cssxio/cssx');
  expect(serializeCss(result?.rules ?? [])).toContain('padding:calc(0.25rem * 4)');
  expect(result?.candidates).toHaveProperty('p-4');
});

it('skips unsupported source files and modules without a CSSX import', async () => {
  await expect(transformCssxModule('const className = "p-4";', '/project/styles.ts')).resolves.toBeNull();
  await expect(
    transformCssxModule(`import { sx } from '@cssxio/cssx';\nsx('p-4');`, '/project/styles.txt'),
  ).resolves.toBeNull();
});
