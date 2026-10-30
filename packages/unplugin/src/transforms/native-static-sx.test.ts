import * as compiler from '@cssxio/compiler';
import { createClassNameAllocator } from '@cssxio/compiler';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { compileStaticSxCalls, scanNativeStaticSxModule } from './native-static-sx';
import { transformCssxModule } from './transform';

const stableFileName = '/project/src/card.tsx';
const source = "import { sx } from '@cssxio/cssx';\nexport const className = sx('p-4 bg-red-500');";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('compileStaticSxCalls', () => {
  it('matches Babel metadata for static sx calls using stable development names', async () => {
    const babelAllocator = createClassNameAllocator({ variant: 'random' });
    const nativeAllocator = createClassNameAllocator({ variant: 'random' });
    const babelResult = await transformCssxModule(
      source,
      stableFileName,
      {
        mode: 'development',
        stableClassNames: true,
        stableClassNameStrategy: 'module-order',
        stableClassNameFileName: stableFileName,
        classNameAllocator: babelAllocator,
        reusabilityBudget: 0,
      },
      undefined,
      { compileCss: false },
    );
    const nativeResult = compileStaticSxCalls(
      [
        {
          entryPoint: 'sx',
          line: 2,
          column: source.split('\n')[1]!.indexOf('sx('),
          staticSx: true,
          utilities: ['p-4 bg-red-500'],
        },
      ],
      stableFileName,
      undefined,
      nativeAllocator,
    );

    expect(nativeResult).toEqual({
      candidates: babelResult?.candidates,
      composites: babelResult?.composites,
      atomicClasses: babelResult?.atomicClasses,
      origins: babelResult?.origins,
    });
  });

  it('keeps per-call stable selectors independent of utility text and literal length', () => {
    const first = compileStaticSxCalls(
      [
        { entryPoint: 'sx', line: 1, column: 0, staticSx: true, utilities: ['p-4'] },
        { entryPoint: 'sx', line: 1, column: 16, staticSx: true, utilities: ['text-lg'] },
      ],
      stableFileName,
      undefined,
      createClassNameAllocator({ variant: 'random' }),
    );
    const second = compileStaticSxCalls(
      [
        { entryPoint: 'sx', line: 1, column: 0, staticSx: true, utilities: ['p-64'] },
        { entryPoint: 'sx', line: 1, column: 20, staticSx: true, utilities: ['text-2xl'] },
      ],
      stableFileName,
      undefined,
      createClassNameAllocator({ variant: 'random' }),
    );

    expect(Object.keys(first!.composites ?? {})).toEqual(Object.keys(second!.composites ?? {}));
  });

  it('skips blank and generated class names while preserving valid calls', () => {
    const result = compileStaticSxCalls(
      [
        { entryPoint: 'sx', line: 1, column: 0, staticSx: true, utilities: ['  '] },
        { entryPoint: 'sx', line: 1, column: 4, staticSx: true, utilities: ['s0x'] },
        { entryPoint: 'sx', line: 2, column: 0, staticSx: true, utilities: ['p-4'] },
        { entryPoint: 'sx', line: 3, column: 0, staticSx: true, utilities: ['p-4'] },
      ],
      stableFileName,
      undefined,
      createClassNameAllocator({ variant: 'random' }),
    );

    expect(result?.candidates).toHaveProperty('p-4');
    expect(Object.keys(result?.composites ?? {})).toHaveLength(2);
    expect(result?.origins?.['p-4']).toEqual({ line: 1, column: 0 });
  });

  it('falls back when compilation fails or yields no atomic selectors', () => {
    const compile = vi.spyOn(compiler, 'compileStyleRecords');
    compile.mockImplementationOnce(() => {
      throw new Error('invalid theme');
    });
    expect(
      compileStaticSxCalls(
        [{ entryPoint: 'sx', line: 1, column: 0, staticSx: true, utilities: ['p-4'] }],
        stableFileName,
        undefined,
        createClassNameAllocator({ variant: 'random' }),
      ),
    ).toBeUndefined();
    compile.mockRestore();

    const empty = vi.spyOn(compiler, 'compileStyleRecords');
    empty.mockReturnValueOnce({ classes: {}, styles: { inline: { _: [] } } } as never);
    expect(
      compileStaticSxCalls(
        [{ entryPoint: 'sx', line: 1, column: 0, staticSx: true, utilities: ['p-4'] }],
        stableFileName,
        undefined,
        createClassNameAllocator({ variant: 'random' }),
      ),
    ).toBeUndefined();
    empty.mockRestore();
  });
});

describe('scanNativeStaticSxModule', () => {
  const options = {
    mode: 'development' as const,
    stableClassNames: true,
    stableClassNameStrategy: 'module-order' as const,
  };
  const callStart = source.indexOf('sx(');
  const call = {
    entryPoint: 'sx',
    startUtf16: callStart,
    endUtf16: source.indexOf(';', callStart),
    line: 1,
    column: 0,
    staticSx: true,
    utilities: ['p-4'],
  };

  it('skips production modules and files without CSSX imports', async () => {
    const native = { findCssxCalls: vi.fn(() => [call]) };

    await expect(
      scanNativeStaticSxModule(
        source,
        stableFileName,
        '/project',
        { mode: 'production' },
        createClassNameAllocator(),
        stableFileName,
        native,
      ),
    ).resolves.toEqual({ handled: false });
    await expect(
      scanNativeStaticSxModule(
        'export const value = true;',
        stableFileName,
        '/project',
        options,
        createClassNameAllocator(),
        stableFileName,
        native,
      ),
    ).resolves.toEqual({ handled: false });
    expect(native.findCssxCalls).not.toHaveBeenCalled();
  });

  it('falls back when native analysis is unavailable, fails, or finds dynamic entries', async () => {
    await expect(
      scanNativeStaticSxModule(
        source,
        stableFileName,
        '/project',
        options,
        createClassNameAllocator(),
        stableFileName,
        null,
      ),
    ).resolves.toEqual({ handled: false });

    const throwing = {
      findCssxCalls: vi.fn(() => {
        throw new Error('parse failed');
      }),
    };
    await expect(
      scanNativeStaticSxModule(
        source,
        stableFileName,
        '/project',
        options,
        createClassNameAllocator(),
        stableFileName,
        throwing,
      ),
    ).resolves.toEqual({ handled: false });

    const dynamic = { findCssxCalls: vi.fn(() => [{ ...call, staticSx: false }]) };
    await expect(
      scanNativeStaticSxModule(
        source,
        stableFileName,
        '/project',
        options,
        createClassNameAllocator(),
        stableFileName,
        dynamic,
      ),
    ).resolves.toEqual({ handled: false });
  });

  it('handles empty native scans and emits metadata for static calls', async () => {
    const empty = { findCssxCalls: vi.fn(() => []) };
    await expect(
      scanNativeStaticSxModule(
        source,
        stableFileName,
        '/project',
        options,
        createClassNameAllocator(),
        stableFileName,
        empty,
      ),
    ).resolves.toEqual({ handled: true });

    const native = { findCssxCalls: vi.fn(() => [call]) };
    const transformed = await scanNativeStaticSxModule(
      source,
      stableFileName,
      '/project',
      options,
      createClassNameAllocator(),
      stableFileName,
      native,
    );
    expect(transformed).toMatchObject({
      handled: true,
      module: { id: stableFileName, candidates: { 'p-4': expect.any(String) } },
      transformedCode: expect.stringContaining('className = "'),
      map: { version: 3, sources: [stableFileName], sourcesContent: [source] },
    });
  });

  it('rejects options that do not use stable module-order selectors', async () => {
    const native = { findCssxCalls: vi.fn(() => [call]) };
    for (const candidateOptions of [
      { ...options, stableClassNames: false },
      { ...options, stableClassNameStrategy: 'source-location' as const },
    ]) {
      await expect(
        scanNativeStaticSxModule(
          source,
          stableFileName,
          '/project',
          candidateOptions,
          createClassNameAllocator(),
          stableFileName,
          native,
        ),
      ).resolves.toEqual({ handled: false });
    }
    expect(native.findCssxCalls).not.toHaveBeenCalled();
  });

  it('keeps project scan metadata when a native call lacks rewrite spans', async () => {
    const native = {
      findCssxCalls: vi.fn(() => [{ ...call, startUtf16: undefined, endUtf16: undefined }]),
    };
    const result = await scanNativeStaticSxModule(
      source,
      stableFileName,
      '/project',
      options,
      createClassNameAllocator(),
      stableFileName,
      native,
    );

    expect(result).toMatchObject({ handled: true, module: { candidates: { 'p-4': expect.any(String) } } });
    expect(result).not.toHaveProperty('transformedCode');
  });

  it('leaves already generated classes unchanged', async () => {
    const generatedSource = "import { sx } from '@cssxio/cssx'; export const className = sx('s0x');";
    const start = generatedSource.indexOf('sx(');
    const native = {
      findCssxCalls: vi.fn(() => [
        {
          ...call,
          startUtf16: start,
          endUtf16: generatedSource.indexOf(';', start),
          utilities: ['s0x'],
        },
      ]),
    };

    await expect(
      scanNativeStaticSxModule(
        generatedSource,
        stableFileName,
        '/project',
        options,
        createClassNameAllocator(),
        stableFileName,
        native,
      ),
    ).resolves.toMatchObject({ handled: true, transformedCode: generatedSource });
  });

  it('replaces blank static sx calls with an empty class string', async () => {
    const blankSource = "import { sx } from '@cssxio/cssx'; export const className = sx('');";
    const start = blankSource.indexOf('sx(');
    const native = {
      findCssxCalls: vi.fn(() => [
        {
          ...call,
          startUtf16: start,
          endUtf16: blankSource.indexOf(';', start),
          utilities: [''],
        },
      ]),
    };

    await expect(
      scanNativeStaticSxModule(
        blankSource,
        stableFileName,
        '/project',
        options,
        createClassNameAllocator(),
        stableFileName,
        native,
      ),
    ).resolves.toMatchObject({
      handled: true,
      transformedCode: 'import { sx } from \'@cssxio/cssx\'; export const className = "";',
    });
  });

  it('keeps generated JavaScript and css-only identity stable across utility edits', async () => {
    const scan = async (value: string) => {
      const editedSource = `import { sx } from '@cssxio/cssx'; export const className = sx('${value}');`;
      const start = editedSource.indexOf('sx(');
      const native = {
        findCssxCalls: vi.fn(() => [
          {
            ...call,
            startUtf16: start,
            endUtf16: editedSource.indexOf(';', start),
            utilities: [value],
          },
        ]),
      };
      return scanNativeStaticSxModule(
        editedSource,
        stableFileName,
        '/project',
        options,
        createClassNameAllocator({ variant: 'random' }),
        stableFileName,
        native,
      );
    };

    const short = await scan('p-4');
    const longer = await scan('p-64');

    expect(short.handled).toBe(true);
    expect(longer.handled).toBe(true);
    if (!short.handled || !longer.handled) {
      throw new Error('Static native scan did not handle the utility edit.');
    }
    expect(longer.transformedCode).toBe(short.transformedCode);
    expect(longer.cssOnlySignature).toBe(short.cssOnlySignature);
  });

  it('uses the default addon loader and falls back when static utilities emit no rules', async () => {
    vi.stubEnv('CSSX_DISABLE_NATIVE_COMPILER', '1');
    await expect(
      scanNativeStaticSxModule(source, stableFileName, '/project', options, createClassNameAllocator(), stableFileName),
    ).resolves.toEqual({ handled: false });
    vi.unstubAllEnvs();

    const invalid = { findCssxCalls: vi.fn(() => [{ ...call, utilities: ['not-a-cssx-utility'] }]) };
    await expect(
      scanNativeStaticSxModule(
        source,
        stableFileName,
        '/project',
        options,
        createClassNameAllocator(),
        stableFileName,
        invalid,
      ),
    ).resolves.toEqual({ handled: false });
  });
});
