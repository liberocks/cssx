import { createClassNameAllocator, serializeCss } from '@cssxio/compiler';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it, vi } from 'vitest';

import { nativeBuildState } from '../native/native-build-state';
import { RULES_METADATA_KEY, type ModuleCssxData } from '../transforms/module-cssx-data';
import * as projectScan from '../transforms/project-scan';
import { createTransformHandler } from './create-transform-handler';

it('transforms utilities and records module data for CSS extraction', async () => {
  const rollupDataById = new Map<string, ModuleCssxData>();
  const esbuildDataById = new Map<string, ModuleCssxData>();
  const addWatchFile = vi.fn();
  const notifyViteStyles = vi.fn();
  const handler = createTransformHandler({
    framework: 'vite',
    options: { theme: '@theme {}', mode: 'development' },
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
  expect(result!.code).not.toContain("from '@cssxio/cssx'");
  expect(result!.meta[RULES_METADATA_KEY]).toMatchObject({
    id: '/project/app.ts',
    rules: [],
    candidates: { 'p-4': expect.any(String) },
  });
  expect(rollupDataById.get('/project/app.ts')?.candidates).toHaveProperty('p-4');
  expect(esbuildDataById.get('/project/app.ts')?.candidates).toHaveProperty('p-4');
  expect(notifyViteStyles).toHaveBeenCalledExactlyOnceWith();
  expect(result!.code).toContain('new EventSource(import.meta.env.BASE_URL + "cssx.css.events")');
});

it('keeps production per-module CSS compilation enabled', async () => {
  const handler = createTransformHandler({
    framework: 'webpack',
    options: { mode: 'production' },
    classNameAllocator: createClassNameAllocator(),
    rollupDataById: new Map(),
    esbuildDataById: new Map(),
    cssFileName: 'cssx.css',
    getEsbuildWorkingDirectory: () => '/project',
    notifyViteStyles: vi.fn(),
  });

  const result = await handler.call(
    {},
    `import { sx } from '@cssxio/cssx'; export const className = sx('p-4');`,
    '/project/app.ts',
  );

  expect(serializeCss((result!.meta[RULES_METADATA_KEY] as ModuleCssxData).rules)).toContain(
    'padding:calc(0.25rem * 4)',
  );
});

it('retains arbitrary CSS in module metadata', async () => {
  const handler = createTransformHandler({
    framework: 'webpack',
    options: { mode: 'production', sourceMap: false },
    classNameAllocator: createClassNameAllocator(),
    rollupDataById: new Map(),
    esbuildDataById: new Map(),
    cssFileName: 'cssx.css',
    getEsbuildWorkingDirectory: () => '/project',
    notifyViteStyles: vi.fn(),
  });
  const result = await handler.call(
    {},
    "import { create, props } from '@cssxio/cssx'; const styles = create({ root: '[color:#fff]' }); export const value = props(styles.root);",
    '/project/app.ts',
  );

  const data = result?.meta[RULES_METADATA_KEY] as ModuleCssxData;
  expect(data.precompiledCss ?? serializeCss(data.rules)).toContain('color:#fff');
});

it('skips generated framework output before transforming source', async () => {
  const rollupDataById = new Map<string, ModuleCssxData>();
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

  await expect(
    handler.call(
      {},
      "import { sx } from '@cssxio/cssx'; export const className = sx('p-4');",
      '/project/.open-next/page.ts',
    ),
  ).resolves.toBeNull();
  expect(rollupDataById).toEqual(new Map());
});

it('shares development atomic allocations across modules and repeated utilities', async () => {
  const handler = createTransformHandler({
    framework: 'rollup',
    options: { mode: 'development' },
    classNameAllocator: createClassNameAllocator(),
    rollupDataById: new Map(),
    esbuildDataById: new Map(),
    cssFileName: 'cssx.css',
    getEsbuildWorkingDirectory: () => '/project',
    notifyViteStyles: vi.fn(),
  });
  const transform = (code: string, id: string) => handler.call({}, code, id);
  const first = await transform("import { sx } from '@cssxio/cssx'; export const style = sx('p-4');", '/project/a.ts');
  const second = await transform(
    "import { sx } from '@cssxio/cssx'; export const style = sx('bg-red-500');",
    '/project/b.ts',
  );
  const third = await transform("import { sx } from '@cssxio/cssx'; export const style = sx('p-4');", '/project/c.ts');
  const metadata = (result: NonNullable<typeof first>) => result.meta[RULES_METADATA_KEY] as ModuleCssxData;

  expect(metadata(first!).candidates['p-4']).not.toBe(metadata(second!).candidates['bg-red-500']);
  expect(metadata(first!).candidates['p-4']).toBe(metadata(third!).candidates['p-4']);
});

it('synchronizes Rollup watch transforms with the stylesheet coordinator cache', async () => {
  const updateProjectScanModule = vi.spyOn(projectScan, 'updateProjectScanModule').mockResolvedValue(true);
  const notifyDevelopmentStyles = vi.fn();
  const handler = createTransformHandler({
    framework: 'rollup',
    options: { mode: 'development' },
    classNameAllocator: createClassNameAllocator(),
    rollupDataById: new Map(),
    esbuildDataById: new Map(),
    cssFileName: 'cssx.css',
    getEsbuildWorkingDirectory: () => process.cwd(),
    notifyViteStyles: vi.fn(),
    notifyDevelopmentStyles,
    getDevelopmentHmrConnection: () => ({ port: 4444, token: 'rollup-test' }),
  });

  try {
    const result = await handler.call(
      { meta: { watchMode: true }, skipRollupStylesheetPush: true },
      `import { sx } from '@cssxio/cssx'; export const className = sx('p-4');`,
      '/project/style.ts',
    );

    expect(updateProjectScanModule).toHaveBeenCalledWith(
      process.cwd(),
      '/project/style.ts',
      expect.objectContaining({ mode: 'development' }),
      expect.objectContaining({ candidates: { 'p-4': expect.any(String) } }),
      expect.stringContaining("sx('p-4')"),
    );
    expect(notifyDevelopmentStyles).not.toHaveBeenCalled();
    expect(result!.code).toContain('__cssxDevelopmentStylesheetHmr');
  } finally {
    updateProjectScanModule.mockRestore();
  }
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

it('resolves additional source roots before transforming workspace modules', async () => {
  const handler = createTransformHandler({
    framework: 'rollup',
    options: { sourceRoots: ['/project/shared'] },
    classNameAllocator: createClassNameAllocator(),
    rollupDataById: new Map(),
    esbuildDataById: new Map(),
    cssFileName: 'cssx.css',
    getEsbuildWorkingDirectory: () => '/project',
    notifyViteStyles: vi.fn(),
  });

  const result = await handler.call(
    {},
    "import { sx } from '@cssxio/cssx'; export const className = sx('p-4');",
    '/project/shared/Card.tsx',
  );

  expect(result?.meta[RULES_METADATA_KEY]).toMatchObject({ id: '/project/shared/Card.tsx' });
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

it('adds the native stylesheet HMR runtime only to transformed development Webpack modules', async () => {
  const handler = createTransformHandler({
    framework: 'webpack',
    options: { mode: 'development' },
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

  expect(result!.code).toContain('styles.css');

  const updatedResult = await handler.call(
    {},
    `import { create } from '@cssxio/cssx'; export const styles = create({ root: 'p-8' });`,
    '/project/app.ts',
  );
  expect(result!.code.match(/CSSX development stylesheet revision: (\w+)/)?.[1]).not.toBe(
    updatedResult!.code.match(/CSSX development stylesheet revision: (\w+)/)?.[1],
  );

  const production = createTransformHandler({
    framework: 'webpack',
    options: { mode: 'production' },
    classNameAllocator: createClassNameAllocator(),
    rollupDataById: new Map(),
    esbuildDataById: new Map(),
    cssFileName: 'styles.css',
    getEsbuildWorkingDirectory: () => '/project',
    notifyViteStyles: vi.fn(),
  });
  const productionResult = await production.call(
    {},
    `import { create } from '@cssxio/cssx'; export const styles = create({ root: 'p-4' });`,
    '/project/app.ts',
  );
  expect(productionResult!.code).not.toContain('__cssxStylesheetHmr');
});

it('infers development from the active native compiler when NODE_ENV is unset', async () => {
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
    { getNativeBuildContext: () => ({ framework: 'webpack', compiler: { options: { mode: 'development' } } }) },
    "import { sx } from '@cssxio/cssx'; export const className = sx('p-4');",
    '/project/app.ts',
  );

  expect(result!.code).toContain('__cssxStylesheetHmr');
  expect(result!.meta[RULES_METADATA_KEY]).toMatchObject({ rules: [] });
});

it('pushes a transformed native stylesheet without waiting for the bundler asset hook', async () => {
  const options = { mode: 'development' as const };
  const root = '/cssx-native-hmr-test';
  const sharedState = nativeBuildState(root, options);
  const notify = vi.fn();
  const notifyViteStyles = vi.fn();
  sharedState.notifyDevelopmentStylesheet = notify;
  sharedState.developmentHmr = { port: 45678, token: 'native-transform-test' };
  const handler = createTransformHandler({
    framework: 'rspack',
    options,
    classNameAllocator: createClassNameAllocator(),
    rollupDataById: new Map(),
    esbuildDataById: new Map(),
    cssFileName: 'styles.css',
    getEsbuildWorkingDirectory: () => root,
    notifyViteStyles,
  });

  const result = await handler.call(
    {
      getNativeBuildContext: () => ({
        framework: 'rspack',
        loaderContext: { rootContext: root },
        compiler: { options: { mode: 'development' } },
      }),
    },
    `import { sx } from '@cssxio/cssx'; export const className = sx('p-4');`,
    `${root}/App.tsx`,
  );

  expect(result?.code).toContain('EventSource');
  expect(notify).toHaveBeenCalledOnce();
  await handler.call(
    {
      getNativeBuildContext: () => ({ framework: 'rspack', compiler: { options: { mode: 'development' } } }),
    },
    'export const plain = true;',
    `${root}/App.tsx`,
  );
  const afterStyledModule = notify.mock.calls.length;
  await handler.call(
    {
      getNativeBuildContext: () => ({ framework: 'rspack', compiler: { options: { mode: 'development' } } }),
    },
    'export const stillPlain = true;',
    `${root}/App.tsx`,
  );
  expect(notify.mock.calls.length).toBe(afterStyledModule);
  expect(notifyViteStyles).not.toHaveBeenCalled();
  sharedState.notifyDevelopmentStylesheet = undefined;
  sharedState.developmentHmr = undefined;
});

it('pushes Rollup watch updates over the independent stylesheet transport', async () => {
  const connection = { port: 45678, token: 'rollup-transform-test' };
  const handler = createTransformHandler({
    framework: 'rollup',
    options: { mode: 'development' },
    classNameAllocator: createClassNameAllocator(),
    rollupDataById: new Map(),
    esbuildDataById: new Map(),
    cssFileName: 'cssx.css',
    getEsbuildWorkingDirectory: () => '/project',
    notifyViteStyles: vi.fn(),
    getDevelopmentHmrConnection: () => connection,
  });

  const result = await handler.call(
    { meta: { watchMode: true } },
    `import { sx } from '@cssxio/cssx'; export const className = sx('p-4');`,
    '/project/app.ts',
  );

  expect(result?.code).toContain(`/${connection.token}" + "/events`);
  expect(result?.code).toContain(`http://127.0.0.1:${connection.port}`);
});

it('publishes Rollup style removal only when the prior module contributed CSSX styles', async () => {
  const notifyDevelopmentStyles = vi.fn();
  const rollupDataById = new Map<string, ModuleCssxData>();
  const handler = createTransformHandler({
    framework: 'rollup',
    options: { mode: 'development' },
    classNameAllocator: createClassNameAllocator(),
    rollupDataById,
    esbuildDataById: new Map(),
    cssFileName: 'cssx.css',
    getEsbuildWorkingDirectory: () => '/project',
    notifyViteStyles: vi.fn(),
    notifyDevelopmentStyles,
  });
  const id = '/project/removable.ts';
  const transformed = await handler.call(
    { meta: { watchMode: true } },
    "import { sx } from '@cssxio/cssx'; export const className = sx('p-4');",
    id,
  );
  expect(transformed).toBeDefined();
  expect(notifyDevelopmentStyles).toHaveBeenCalledOnce();
  await handler.call({ meta: { watchMode: true } }, 'export const plain = true;', id);
  expect(notifyDevelopmentStyles).toHaveBeenCalledTimes(2);
  await handler.call({ meta: { watchMode: true } }, 'export const stillPlain = true;', id);
  expect(notifyDevelopmentStyles).toHaveBeenCalledTimes(2);
  expect(rollupDataById.get(id)?.candidates).toEqual({});
});

it('uses stable development selectors and records metadata without per-module CSS rules', async () => {
  const handler = createTransformHandler({
    framework: 'rollup',
    options: { mode: 'development', naming: 'serial', reusabilityBudget: 100 },
    classNameAllocator: createClassNameAllocator(),
    rollupDataById: new Map(),
    esbuildDataById: new Map(),
    cssFileName: 'cssx.css',
    getEsbuildWorkingDirectory: () => '/project',
    notifyViteStyles: vi.fn(),
  });
  const source = (utility: string) => `import { sx } from '@cssxio/cssx'; export const className = sx('${utility}');`;
  const first = await handler.call({}, source('p-4'), '/project/page.tsx');
  const second = await handler.call({}, source('px-8 py-3'), '/project/page.tsx');
  const firstClass = String(first!.code.match(/d[a-z0-9]+/)?.[0]);
  const secondClass = String(second!.code.match(/d[a-z0-9]+/)?.[0]);

  expect(firstClass).toBe(secondClass);
  expect(first!.meta[RULES_METADATA_KEY]).toMatchObject({ candidates: { 'p-4': expect.any(String) }, rules: [] });
  expect(second!.meta[RULES_METADATA_KEY]).toMatchObject({
    candidates: { 'px-8': expect.any(String), 'py-3': expect.any(String) },
    rules: [],
  });
});

it.each(['hash', 'serial'] as const)('applies the explicit %s naming mode', async (naming) => {
  const handler = createTransformHandler({
    framework: 'rollup',
    options: { naming },
    classNameAllocator: createClassNameAllocator({ variant: naming === 'hash' ? 'random' : 'serial' }),
    rollupDataById: new Map(),
    esbuildDataById: new Map(),
    cssFileName: 'cssx.css',
    getEsbuildWorkingDirectory: () => '/project',
    notifyViteStyles: vi.fn(),
  });
  const result = await handler.call(
    {},
    "import { sx } from '@cssxio/cssx'; export const className = sx('p-4');",
    '/project/page.tsx',
  );

  expect(result!.code).toContain('s');
});

it('transforms source modules inside the shared manifest transaction', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-transform-manifest-'));
  const manifestPath = join(root, 'classes.json');
  const previousCwd = process.cwd();
  try {
    process.chdir(root);
    const handler = createTransformHandler({
      framework: 'rollup',
      options: { naming: 'serial', coordination: 'manifest', manifestPath },
      classNameAllocator: createClassNameAllocator(),
      rollupDataById: new Map(),
      esbuildDataById: new Map(),
      cssFileName: 'cssx.css',
      getEsbuildWorkingDirectory: () => root,
      notifyViteStyles: vi.fn(),
    });
    const result = await handler.call(
      {},
      "import { sx } from '@cssxio/cssx'; export const className = sx('p-4');",
      `${root}/page.tsx`,
    );
    expect(result!.meta[RULES_METADATA_KEY]).toMatchObject({ candidates: { 'p-4': expect.any(String) } });
  } finally {
    process.chdir(previousCwd);
    await rm(root, { recursive: true, force: true });
  }
});
