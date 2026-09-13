import { createClassNameAllocator } from '@cssxio/compiler';
import { expect, it, vi } from 'vitest';

import { createTransformHandler } from './create-transform-handler';
import { RULES_METADATA_KEY, type ModuleCssxData } from './module-cssx-data';

it('transforms utilities and records module data for CSS extraction', async () => {
  const rollupDataById = new Map<string, ModuleCssxData>();
  const esbuildDataById = new Map<string, ModuleCssxData>();
  const addWatchFile = vi.fn();
  const notifyViteStyles = vi.fn();
  const handler = createTransformHandler({
    framework: 'vite',
    options: { theme: '@theme {}' },
    classNameAllocator: createClassNameAllocator(),
    rollupDataById,
    esbuildDataById,
    cssFileName: 'cssx.css',
    getEsbuildWorkingDirectory: () => '/project',
    notifyViteStyles,
  });
  const result = await handler.call(
    { addWatchFile },
    `import { create } from '@cssxio/cssx'; export const styles = create({ root: 'p-4' });`,
    '/project/app.ts',
  );

  expect(addWatchFile).not.toHaveBeenCalled();
  expect(result.code).not.toContain("from '@cssxio/cssx'");
  expect(result.meta[RULES_METADATA_KEY]).toMatchObject({
    id: '/project/app.ts',
    candidates: { 'p-4': expect.any(String) },
  });
  expect(rollupDataById.get('/project/app.ts')?.candidates).toHaveProperty('p-4');
  expect(esbuildDataById.get('/project/app.ts')?.candidates).toHaveProperty('p-4');
  expect(notifyViteStyles).toHaveBeenCalledWith('/cssx.css');
});

it('watches the configured theme file even when the source has no CSSX import', async () => {
  const addWatchFile = vi.fn();
  const handler = createTransformHandler({
    framework: 'rollup',
    options: { themeFile: 'theme.css' },
    classNameAllocator: createClassNameAllocator(),
    rollupDataById: new Map(),
    esbuildDataById: new Map(),
    cssFileName: 'cssx.css',
    getEsbuildWorkingDirectory: () => '/project',
    notifyViteStyles: vi.fn(),
  });

  await handler.call({ addWatchFile }, 'export const plain = true', '/project/plain.ts');

  expect(addWatchFile).toHaveBeenCalledWith(expect.stringContaining('theme.css'));
});

it('preserves template records when an uncompiled Astro query module is visited', async () => {
  const existing: ModuleCssxData = {
    id: '/project/Page.astro',
    rules: [],
    candidates: { 'p-4': 'padding' },
    composites: {},
    origins: {},
    cssOnlySignature: '',
  };
  const rollupDataById = new Map([[existing.id, existing]]);
  const handler = createTransformHandler({
    framework: 'rollup',
    options: {},
    classNameAllocator: createClassNameAllocator(),
    rollupDataById,
    esbuildDataById: new Map(),
    cssFileName: 'cssx.css',
    getEsbuildWorkingDirectory: () => '/project',
    notifyViteStyles: vi.fn(),
  });

  await handler.call({}, 'export const Component = {}', '/project/Page.astro?astro&type=script&index=0');

  expect(rollupDataById.get(existing.id)).toBe(existing);
});

it('adds the native stylesheet HMR runtime for transformed Webpack modules', async () => {
  const handler = createTransformHandler({
    framework: 'webpack',
    options: {},
    classNameAllocator: createClassNameAllocator(),
    rollupDataById: new Map(),
    esbuildDataById: new Map(),
    cssFileName: 'styles.css',
    getEsbuildWorkingDirectory: () => '/project',
    notifyViteStyles: vi.fn(),
  });

  const result = await handler.call(
    {},
    `import { create } from '@cssxio/cssx'; export const styles = create({ root: 'p-4' });`,
    '/project/app.ts',
  );

  expect(result.code).toContain('styles.css');
});
