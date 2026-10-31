import { serializeCss } from '@cssxio/compiler';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { transformCssxModule } from './transform-cssx-module';

beforeEach(() => {
  vi.stubEnv('CSSX_DISABLE_NATIVE_COMPILER', '');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

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

it('returns a successful native static sx transform before the Babel fallback', async () => {
  const nativeTransform = {
    code: 'export const className = "d1";',
    rules: [],
    candidates: { 'p-4': 'd1' },
    composites: {},
    atomicClasses: ['d1'],
    origins: {},
    cssOnlySignature: '',
  };
  const tryTransformNativeStaticSxModule = vi.fn().mockResolvedValue(nativeTransform);
  vi.resetModules();
  vi.doMock('./try-transform-native-static-sx', () => ({ tryTransformNativeStaticSxModule }));
  try {
    const { transformCssxModule: transformWithNative } = await import('./transform-cssx-module');
    const result = await transformWithNative(
      `import { sx } from '@cssxio/cssx'; export const className = sx('p-4');`,
      '/project/styles.ts',
      { mode: 'development', stableClassNames: true, stableClassNameStrategy: 'module-order' },
      undefined,
      { compileCss: false },
    );

    expect(result).toBe(nativeTransform);
    expect(tryTransformNativeStaticSxModule).toHaveBeenCalledOnce();
  } finally {
    vi.doUnmock('./try-transform-native-static-sx');
    vi.resetModules();
  }
});

it('uses the native production create/props path when the addon is available', async () => {
  const source =
    "import { create, props } from '@cssxio/cssx'; const styles = create({ root: 'p-4' }); export const value = props(styles.root);";
  const createStart = source.indexOf('create(');
  const propsStart = source.indexOf('props(');
  const calls = [
    {
      entryPoint: 'create',
      start: createStart,
      end: source.indexOf(');', createStart) + 1,
      startUtf16: createStart,
      endUtf16: source.indexOf(');', createStart) + 1,
      line: 1,
      column: 0,
      staticSx: false,
      staticCreate: true,
      staticProps: false,
      fastTransformSafe: true,
      utilities: [],
      styles: [{ name: 'root', utilities: 'p-4' }],
      styleNames: [],
    },
    {
      entryPoint: 'props',
      start: propsStart,
      end: source.indexOf(');', propsStart) + 1,
      startUtf16: propsStart,
      endUtf16: source.indexOf(');', propsStart) + 1,
      line: 1,
      column: 0,
      staticSx: false,
      staticCreate: false,
      staticProps: true,
      fastTransformSafe: true,
      utilities: [],
      styles: [],
      styleNames: ['root'],
    },
  ];
  vi.resetModules();
  vi.unstubAllEnvs();
  vi.stubEnv('CSSX_DISABLE_NATIVE_COMPILER', '');
  vi.stubEnv('CSSX_NATIVE_COMPILER_PATH', '/mock/cssx-native.node');
  const dlopen = vi.spyOn(process, 'dlopen').mockImplementation((module) => {
    (module as { exports: unknown }).exports = { findCssxCalls: () => calls };
  });
  try {
    const { transformCssxModule: transformWithNative } = await import('./transform-cssx-module');
    const result = await transformWithNative(source, '/project/styles.ts', {
      mode: 'production',
      sourceMap: false,
    });

    expect(result?.code).toContain('className');
    expect(result?.candidates).toHaveProperty('p-4');
    expect(dlopen).toHaveBeenCalledOnce();
  } finally {
    dlopen.mockRestore();
    vi.unstubAllEnvs();
  }
});
