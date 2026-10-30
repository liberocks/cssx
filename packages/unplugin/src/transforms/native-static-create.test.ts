import { createClassNameAllocator } from '@cssxio/compiler';
import { describe, expect, it, vi } from 'vitest';

import { transformNativeStaticCreateModule } from './native-static-create';
import type { NativeCssxCall } from './native-static-sx';
import { transformBabelCssxModule } from './transform-babel-cssx-module';

const source =
  "import * as cssx from '@cssxio/cssx'; const styles = cssx.create({ root: 'p-4 bg-red-500', accent: 'text-white' }); export const value = cssx.props(styles.root);";
const styleEntries = [
  { name: 'root', utilities: 'p-4 bg-red-500' },
  { name: 'accent', utilities: 'text-white' },
];

function call(entryPoint: string, start: number, end: number, fields: Partial<NativeCssxCall> = {}): NativeCssxCall {
  return {
    entryPoint,
    start,
    end,
    startUtf16: start,
    endUtf16: end,
    line: 1,
    column: 0,
    staticSx: false,
    staticCreate: false,
    staticProps: false,
    fastTransformSafe: true,
    utilities: [],
    styles: [],
    styleNames: [],
    ...fields,
  };
}

function analyzer(calls: readonly NativeCssxCall[]) {
  return { findCssxCalls: () => [...calls] };
}

function staticCalls(input = source, names = ['root'], entries = styleEntries) {
  const createStart = input.indexOf('cssx.create') >= 0 ? input.indexOf('cssx.create') : input.indexOf('create(');
  const propsStart = input.indexOf('cssx.props') >= 0 ? input.indexOf('cssx.props') : input.indexOf('props(');
  return [
    call('create', createStart, input.indexOf(');', createStart) + 1, {
      column: createStart,
      staticCreate: true,
      styles: entries,
    }),
    call('props', propsStart, input.indexOf(');', propsStart) + 1, {
      column: propsStart,
      staticProps: true,
      styleNames: names,
    }),
  ];
}

describe('transformNativeStaticCreateModule', () => {
  it('matches Babel utility declarations and static props output', async () => {
    const options = { mode: 'production' as const, sourceMap: false, className: { variant: 'serial' as const } };
    const nativeResult = await transformNativeStaticCreateModule(
      source,
      '/project/page.tsx',
      '/project',
      options,
      createClassNameAllocator(options.className),
      analyzer(staticCalls()),
    );
    const babelResult = await transformBabelCssxModule(source, '/project/page.tsx', {
      ...options,
      classNameAllocator: createClassNameAllocator(options.className),
    });

    expect(nativeResult).not.toBeNull();
    expect(Object.keys(nativeResult?.candidates ?? {}).sort()).toEqual(Object.keys(babelResult.candidates).sort());
    expect(nativeResult?.atomicClasses).toEqual(Object.values(nativeResult?.candidates ?? {}).sort());
    expect(nativeResult?.origins).toEqual(babelResult.origins);
    const declarations = (rules: readonly { css: string }[]) =>
      rules
        .flatMap(({ css }) => [...css.matchAll(/\{([^{}]*)\}/g)].flatMap((match) => match[1]!.split(';')))
        .filter(Boolean)
        .sort();
    expect(declarations(nativeResult?.rules ?? [])).toEqual(declarations(babelResult.rules));
    expect(nativeResult?.code).toContain('const styles = {};');
    expect(nativeResult?.code).toContain('value = {"className":');
  });

  it('compiles plain arbitrary properties without loading the utility registry', async () => {
    const input =
      "import { create, props } from '@cssxio/cssx'; const styles = create({ root: '[display:inline-flex] [box-shadow:0 1px 2px rgb(0 0 0 / 0.1)]', accent: '[color:#fff]' }); export const value = props(styles.root);";
    const entries = [
      { name: 'root', utilities: '[display:inline-flex] [box-shadow:0 1px 2px rgb(0 0 0 / 0.1)]' },
      { name: 'accent', utilities: '[color:#fff]' },
    ];
    const result = await transformNativeStaticCreateModule(
      input,
      '/project/page.tsx',
      '/project',
      { mode: 'production', sourceMap: false },
      createClassNameAllocator(),
      analyzer(staticCalls(input, ['root'], entries)),
    );
    const babelResult = await transformBabelCssxModule(input, '/project/page.tsx', {
      mode: 'production',
      sourceMap: false,
      classNameAllocator: createClassNameAllocator(),
    });

    const declarations = (rules: readonly { css: string }[]) =>
      rules
        .flatMap(({ css }) => [...css.matchAll(/\{([^{}]*)\}/g)].flatMap((match) => match[1]!.split(';')))
        .filter(Boolean)
        .sort();
    expect(result?.candidates).toHaveProperty('[display:inline-flex]');
    expect(result?.candidates).toHaveProperty('[box-shadow:0 1px 2px rgb(0 0 0 / 0.1)]');
    expect(result?.precompiledCss).toContain('display:inline-flex}');
    expect(result?.code).toContain('className');
    expect(declarations(result?.rules ?? [])).toEqual(declarations(babelResult.rules));
  });

  it('splits arbitrary utilities on JavaScript whitespace', async () => {
    const utilities = '[color:#fff]\u00a0[padding:1rem]\t[margin:2px]';
    const input = `import { create, props } from '@cssxio/cssx'; const styles = create({ root: ${JSON.stringify(utilities)} }); export const value = props(styles.root);`;
    const result = await transformNativeStaticCreateModule(
      input,
      '/project/page.tsx',
      '/project',
      { mode: 'production', sourceMap: false },
      createClassNameAllocator(),
      analyzer(staticCalls(input, ['root'], [{ name: 'root', utilities }])),
    );

    expect(Object.keys(result?.candidates ?? {}).sort()).toEqual(['[color:#fff]', '[margin:2px]', '[padding:1rem]']);
    expect(result?.precompiledCss).toContain('color:#fff}');
    expect(result?.precompiledCss).toContain('padding:1rem}');
    expect(result?.precompiledCss).toContain('margin:2px}');
  });

  it('accepts every JavaScript whitespace separator', async () => {
    const whitespace = [
      ...Array.from({ length: 5 }, (_, index) => String.fromCharCode(0x09 + index)),
      ' ',
      '\u00a0',
      '\u1680',
      ...Array.from({ length: 11 }, (_, index) => String.fromCharCode(0x2000 + index)),
      '\u2028',
      '\u2029',
      '\u202f',
      '\u205f',
      '\u3000',
      '\ufeff',
    ];
    const utilities = `[color:#fff]${whitespace.join('')}[padding:1rem]`;
    const input = `import { create, props } from '@cssxio/cssx'; const styles = create({ root: ${JSON.stringify(utilities)} }); export const value = props(styles.root);`;
    const result = await transformNativeStaticCreateModule(
      input,
      '/project/page.tsx',
      '/project',
      { mode: 'production', sourceMap: false },
      createClassNameAllocator(),
      analyzer(staticCalls(input, ['root'], [{ name: 'root', utilities }])),
    );

    expect(Object.keys(result?.candidates ?? {}).sort()).toEqual(['[color:#fff]', '[padding:1rem]']);
  });

  it('reuses cached arbitrary declarations and allows equal duplicate properties', async () => {
    const input =
      "import { create, props } from '@cssxio/cssx'; const styles = create({ root: '[color:#fff] [Color:#fff]', accent: '[color:#fff]' }); const first = props(styles.root); const second = props(styles.accent);";
    const entries = [
      { name: 'root', utilities: '[color:#fff] [Color:#fff]' },
      { name: 'accent', utilities: '[color:#fff]' },
    ];
    const calls = staticCalls(input, ['root'], entries);
    const secondStart = input.indexOf('props(', input.indexOf('props(') + 1);
    calls.push(
      call('props', secondStart, input.indexOf(');', secondStart) + 1, {
        column: secondStart,
        staticProps: true,
        styleNames: ['accent'],
      }),
    );
    const result = await transformNativeStaticCreateModule(
      input,
      '/project/page.tsx',
      '/project',
      { mode: 'production', sourceMap: false },
      createClassNameAllocator(),
      analyzer(calls),
    );

    expect(Object.keys(result?.candidates ?? {}).sort()).toEqual(['[Color:#fff]', '[color:#fff]']);
    expect(result?.precompiledCss?.match(/color:#fff}/g)).toHaveLength(1);
  });

  it('replaces empty arbitrary props calls and sorts out-of-order source spans', async () => {
    const emptyInput =
      "import { create, props } from '@cssxio/cssx'; const styles = create({ root: '[color:#fff]' }); export const value = props();";
    const emptyCalls = staticCalls(emptyInput, [], [{ name: 'root', utilities: '[color:#fff]' }]);
    emptyCalls[1] = { ...emptyCalls[1]!, styleNames: undefined };
    const emptyResult = await transformNativeStaticCreateModule(
      emptyInput,
      '/project/empty.tsx',
      '/project',
      { mode: 'production', sourceMap: false },
      createClassNameAllocator(),
      analyzer(emptyCalls),
    );
    expect(emptyResult?.code).toContain('className":""');

    const reorderedInput =
      "import { create, props } from '@cssxio/cssx'; export const value = props(styles.root); const styles = create({ root: '[color:#fff]' });";
    const reorderedCalls = staticCalls(reorderedInput, ['root'], [{ name: 'root', utilities: '[color:#fff]' }]);
    const reorderedResult = await transformNativeStaticCreateModule(
      reorderedInput,
      '/project/reordered.tsx',
      '/project',
      { mode: 'production', sourceMap: false },
      createClassNameAllocator(),
      analyzer(reorderedCalls),
    );

    expect(reorderedResult?.code).toContain('const styles = {};');
    expect(reorderedResult?.code).toContain('className');
  });

  it('falls back when native analysis has a missing style name', async () => {
    const input =
      "import { create, props } from '@cssxio/cssx'; const styles = create({ root: '[color:#fff]' }); export const value = props(styles.root);";
    const result = await transformNativeStaticCreateModule(
      input,
      '/project/page.tsx',
      '/project',
      { mode: 'production', sourceMap: false },
      createClassNameAllocator(),
      {
        findCssxCalls: () => [],
        analyzeCssxModule: () => ({
          fastStaticCreate: true,
          styles: [{ name: 'root', utilities: '[color:#fff]' }],
          usedStyleNames: ['missing'],
          createLine: 1,
          createColumn: 0,
          replaceCalls: () => 'const value = {};',
          getCalls: () => [],
        }),
      },
    );

    expect(result).toBeNull();
  });

  it('keeps supported static create call records in the native addon', async () => {
    const input =
      "import { create, props } from '@cssxio/cssx'; const styles = create({ root: '[color:#fff]' }); export const value = props(styles.root);";
    const replacement = JSON.stringify({ className: 's0x' });
    const replaceCalls = vi.fn(() =>
      input.replace("create({ root: '[color:#fff]' })", '{}').replace('props(styles.root)', replacement),
    );
    const getCalls = vi.fn(() => staticCalls(input, ['root'], [{ name: 'root', utilities: '[color:#fff]' }]));
    const findCssxCalls = vi.fn(() => {
      throw new Error('the native analysis should replace the legacy call list');
    });
    const result = await transformNativeStaticCreateModule(
      input,
      '/project/page.tsx',
      '/project',
      { mode: 'production', sourceMap: false },
      createClassNameAllocator(),
      {
        findCssxCalls,
        analyzeCssxModule: () => ({
          fastStaticCreate: true,
          styles: [{ name: 'root', utilities: '[color:#fff]' }],
          usedStyleNames: ['root'],
          createLine: 1,
          createColumn: 0,
          replaceCalls,
          getCalls,
        }),
      },
    );

    expect(result?.code).toBe(
      input.replace("create({ root: '[color:#fff]' })", '{}').replace('props(styles.root)', replacement),
    );
    expect(result?.candidates).toHaveProperty('[color:#fff]');
    expect(replaceCalls).toHaveBeenCalledWith([{ name: 'root', replacement }]);
    expect(findCssxCalls).not.toHaveBeenCalled();
    expect(getCalls).toHaveBeenCalledTimes(1);
  });

  it('uses deferred native call records when the Rust analysis declines the static fast path', async () => {
    const input =
      "import { create, props } from '@cssxio/cssx'; const styles = create({ root: 'p-4' }); export const value = props(styles.root);";
    const calls = staticCalls(input, ['root'], [{ name: 'root', utilities: 'p-4' }]);
    const getCalls = vi.fn(() => calls);
    const result = await transformNativeStaticCreateModule(
      input,
      '/project/page.tsx',
      '/project',
      { mode: 'production', sourceMap: false },
      createClassNameAllocator(),
      {
        findCssxCalls: () => [],
        analyzeCssxModule: () => ({
          fastStaticCreate: false,
          styles: [],
          usedStyleNames: [],
          createLine: 1,
          createColumn: 0,
          replaceCalls: () => input,
          getCalls,
        }),
      },
    );

    expect(getCalls).toHaveBeenCalledOnce();
    expect(result?.candidates).toHaveProperty('p-4');
  });

  it('removes a CSSX runtime import made unused by a static rewrite', async () => {
    const input =
      "import { create, props } from '@cssxio/cssx'; const styles = create({ root: 'p-4' }); export const value = props(styles.root);";
    const calls = staticCalls(input, ['root'], [{ name: 'root', utilities: 'p-4' }]);
    const importStart = input.indexOf('import');
    const importEnd = input.indexOf(';') + 1;
    const result = await transformNativeStaticCreateModule(
      input,
      '/project/page.tsx',
      '/project',
      { mode: 'production', sourceMap: false },
      createClassNameAllocator(),
      {
        findCssxCalls: () => [],
        analyzeCssxModule: () => ({
          fastStaticCreate: false,
          styles: [],
          usedStyleNames: [],
          createLine: 1,
          createColumn: 0,
          removableImports: [{ start: importStart, end: importEnd }],
          replaceCalls: () => input,
          getCalls: () => calls,
        }),
      },
    );

    expect(result?.code).not.toContain("from '@cssxio/cssx'");
    expect(result?.code).toContain('className');
    expect(result?.map?.sources).toEqual(['/project/page.tsx']);
  });

  it('returns to the Babel fallback when Oxc analysis fails', async () => {
    await expect(
      transformNativeStaticCreateModule(
        source,
        '/project/page.tsx',
        '/project',
        { mode: 'production', sourceMap: false },
        createClassNameAllocator(),
        {
          findCssxCalls: () => [],
          analyzeCssxModule() {
            throw new Error('Oxc parse failure');
          },
        },
      ),
    ).resolves.toBeNull();
  });

  it('rejects unsafe arbitrary syntax before loading the utility compiler', async () => {
    const invalidUtilities = [
      '[[color:red]]',
      'color:red]',
      '[color',
      '[color]',
      '[:red]',
      '[bad_prop:red]',
      '[color:]',
      '[color:a{b}]',
      '[color:rgb(1 2 3]',
      '[color:red)]',
      '[color:' + 'a'.repeat(501) + ']',
      '[color:var(--color-red)]',
      '[color:#fff]\u000e[padding:1rem]',
      '[color:#fff]\u200b[padding:1rem]',
    ];

    for (const utilities of invalidUtilities) {
      const input = `import { create, props } from '@cssxio/cssx'; const styles = create({ root: ${JSON.stringify(utilities)} }); export const value = props(styles.root);`;
      const getCalls = vi.fn(() => []);
      const result = await transformNativeStaticCreateModule(
        input,
        '/project/page.tsx',
        '/project',
        { mode: 'production', sourceMap: false },
        createClassNameAllocator(),
        {
          findCssxCalls: () => [],
          analyzeCssxModule: () => ({
            fastStaticCreate: true,
            styles: [{ name: 'root', utilities }],
            usedStyleNames: ['root'],
            createLine: 1,
            createColumn: 0,
            replaceCalls: () => input,
            getCalls,
          }),
        },
      );

      expect(result).toBeNull();
      expect(getCalls).toHaveBeenCalledOnce();
    }
  });

  it('falls back for arbitrary styles with conflicting properties or value aliases', async () => {
    for (const utilities of ['[padding:1px] [padding:2px]', '[font-family:Open_Sans]']) {
      const input = `import { create, props } from '@cssxio/cssx'; const styles = create({ root: '${utilities}' }); export const value = props(styles.root);`;
      const result = await transformNativeStaticCreateModule(
        input,
        '/project/page.tsx',
        '/project',
        { mode: 'production', sourceMap: false },
        createClassNameAllocator(),
        analyzer(staticCalls(input, ['root'], [{ name: 'root', utilities }])),
      );
      expect(result?.rules[0]?.css).toContain('{');
    }
  });

  it('folds multiple static styles with the production composition allocator', async () => {
    const input =
      "import { create, props } from '@cssxio/cssx'; const styles = create({ root: 'p-4 text-white', accent: 'p-2' }); export const value = props(styles.root, styles.accent);";
    const calls = staticCalls(
      input,
      ['root', 'accent'],
      [
        { name: 'root', utilities: 'p-4 text-white' },
        { name: 'accent', utilities: 'p-2' },
      ],
    );
    const options = { mode: 'production' as const, sourceMap: false, className: { variant: 'serial' as const } };
    const result = await transformNativeStaticCreateModule(
      input,
      '/project/page.tsx',
      '/project',
      options,
      createClassNameAllocator(options.className),
      analyzer(calls),
    );
    const babelResult = await transformBabelCssxModule(input, '/project/page.tsx', {
      ...options,
      classNameAllocator: createClassNameAllocator(options.className),
    });

    expect(result?.code).toContain('className');
    expect(result?.candidates).toEqual(babelResult.candidates);
    expect(result?.composites).toEqual(babelResult.composites);
    expect(result?.rules.map((rule) => rule.css)).toEqual(babelResult.rules.map((rule) => rule.css));
    const className = (code: string) => code.match(/["']?className["']?\s*:\s*["']([^"']+)["']/)?.[1];
    expect(className(result?.code ?? '')).toBe(className(babelResult.code));
  });

  it('keeps overlapping utility conflicts on the full production compiler', async () => {
    const input =
      "import { create, props } from '@cssxio/cssx'; const styles = create({ root: 'p-4 px-2' }); export const value = props(styles.root);";
    const calls = staticCalls(input, ['root'], [{ name: 'root', utilities: 'p-4 px-2' }]);
    const result = await transformNativeStaticCreateModule(
      input,
      '/project/page.tsx',
      '/project',
      { mode: 'production', sourceMap: false },
      createClassNameAllocator(),
      analyzer(calls),
    );

    expect(Object.keys(result?.composites ?? {}).length).toBeGreaterThan(0);
    expect(result?.candidates).toHaveProperty('p-4');
    expect(result?.candidates).toHaveProperty('px-2');
  });

  it('retains a winning atomic class after production conflict resolution', async () => {
    const input =
      "import { create, props } from '@cssxio/cssx'; const styles = create({ root: 'p-4 p-2' }); export const value = props(styles.root);";
    const result = await transformNativeStaticCreateModule(
      input,
      '/project/page.tsx',
      '/project',
      { mode: 'production', sourceMap: false },
      createClassNameAllocator(),
      analyzer(staticCalls(input, ['root'], [{ name: 'root', utilities: 'p-4 p-2' }])),
    );

    expect(result?.candidates).toHaveProperty('p-2');
    expect(result?.rules[0]?.css).toContain('padding:calc(0.25rem * 2)');
  });

  it('keeps non-conflicting variants in separate scopes on the native path', async () => {
    const input =
      "import { create, props } from '@cssxio/cssx'; const styles = create({ root: 'p-4 hover:bg-red-500' }); export const value = props(styles.root);";
    const calls = staticCalls(input, ['root'], [{ name: 'root', utilities: 'p-4 hover:bg-red-500' }]);
    const result = await transformNativeStaticCreateModule(
      input,
      '/project/page.tsx',
      '/project',
      { mode: 'production', sourceMap: false },
      createClassNameAllocator(),
      analyzer(calls),
    );

    expect(result?.composites).toEqual({});
    expect(result?.rules[0]?.css).toContain(':hover');
  });

  it('uses the full compiler for utilities outside the direct classifier', async () => {
    const input =
      "import { create, props } from '@cssxio/cssx'; const styles = create({ root: 'cssx-unknown-test' }); export const value = props(styles.root);";
    const calls = staticCalls(input, ['root'], [{ name: 'root', utilities: 'cssx-unknown-test' }]);
    await expect(
      transformNativeStaticCreateModule(
        input,
        '/project/page.tsx',
        '/project',
        { mode: 'production', sourceMap: false },
        createClassNameAllocator(),
        analyzer(calls),
      ),
    ).rejects.toThrow('CSSX cannot classify utility "cssx-unknown-test" for composition.');
  });

  it('reports inconsistent full-compiler static create records', async () => {
    const input =
      "import { create, props } from '@cssxio/cssx'; const styles = create({ root: 'p-4 px-2' }); export const value = props(styles.root);";
    const calls = staticCalls(input, ['root'], [{ name: 'root', utilities: 'p-4 px-2' }]);
    let compiledResult: unknown;
    vi.doMock('@cssxio/compiler', async () => {
      const compiler = await vi.importActual<typeof import('@cssxio/compiler')>('@cssxio/compiler');
      return {
        ...compiler,
        compileStyleRecords: () => compiledResult,
      };
    });

    try {
      const run = () =>
        transformNativeStaticCreateModule(
          input,
          '/project/page.tsx',
          '/project',
          { mode: 'production', sourceMap: false },
          createClassNameAllocator(),
          analyzer(calls),
        );
      compiledResult = { candidates: {}, styles: { root: { c: 's0x' } }, classes: {}, composites: {} };
      await expect(run()).rejects.toThrow('could not find compiled style "root"');

      compiledResult = {
        candidates: { root: ['p-4'] },
        styles: { root: { c: 's0x' } },
        classes: {},
        composites: {},
      };
      await expect(run()).rejects.toThrow('could not find a class name for "p-4"');

      let styleReads = 0;
      const styles = Object.create(null) as Record<string, unknown>;
      Object.defineProperty(styles, 'root', {
        get: () => (styleReads++ === 0 ? { c: 's0x' } : undefined),
      });
      compiledResult = { candidates: { root: [] }, styles, classes: {}, composites: {} };
      await expect(run()).rejects.toThrow('could not find compiled style "root"');

      compiledResult = {
        candidates: { root: [] },
        styles: { root: { c: 'sSolo' } },
        classes: {},
        composites: {},
      };
      const atomicResult = await run();
      expect(atomicResult?.atomicClasses).toEqual(['sSolo']);
    } finally {
      vi.doUnmock('@cssxio/compiler');
    }
  });

  it('reuses classifications across static styles with the same utility', async () => {
    const input =
      "import { create, props } from '@cssxio/cssx'; const styles = create({ root: 'p-4', accent: 'p-4' }); const first = props(styles.root); const second = props(styles.accent);";
    const first = staticCalls(
      input,
      ['root'],
      [
        { name: 'root', utilities: 'p-4' },
        { name: 'accent', utilities: 'p-4' },
      ],
    );
    const secondStart = input.indexOf('props(', input.indexOf('props(') + 1);
    first.push(
      call('props', secondStart, input.indexOf(');', secondStart) + 1, {
        column: secondStart,
        staticProps: true,
        styleNames: ['accent'],
      }),
    );
    const result = await transformNativeStaticCreateModule(
      input,
      '/project/page.tsx',
      '/project',
      { mode: 'production', sourceMap: false },
      createClassNameAllocator(),
      analyzer(first),
    );

    expect(result?.candidates).toHaveProperty('p-4');
    expect(result?.code.match(/className/g)).toHaveLength(2);
  });

  it('emits an empty fallback result when composed styles contain no utilities', async () => {
    const input =
      "import { create, props } from '@cssxio/cssx'; const styles = create({ first: '', second: '' }); export const value = props(styles.first, styles.second); export const blank = props();";
    const calls = staticCalls(
      input,
      ['first', 'second'],
      [
        { name: 'first', utilities: '' },
        { name: 'second', utilities: '' },
      ],
    );
    const emptyPropsStart = input.lastIndexOf('props()');
    calls.push(
      call('props', emptyPropsStart, emptyPropsStart + 'props()'.length, {
        column: emptyPropsStart,
        staticProps: true,
        styleNames: undefined,
      }),
    );
    const result = await transformNativeStaticCreateModule(
      input,
      '/project/page.tsx',
      '/project',
      { mode: 'production', sourceMap: false },
      createClassNameAllocator(),
      analyzer(calls),
    );

    expect(result?.rules).toEqual([]);
    expect(result?.candidates).toEqual({});
    expect(result?.code).toContain('className":""');
  });

  it('emits no CSS for a referenced blank style', async () => {
    const input =
      "import { create, props } from '@cssxio/cssx'; const styles = create({ blank: '' }); export const value = props(styles.blank);";
    const calls = staticCalls(input, ['blank']);
    const blankCalls = [
      { ...calls[0]!, styles: [{ name: 'blank', utilities: '' }] },
      { ...calls[1]!, styleNames: ['blank'] },
    ];
    const result = await transformNativeStaticCreateModule(
      input,
      '/project/page.tsx',
      '/project',
      { mode: 'production', sourceMap: false },
      createClassNameAllocator(),
      analyzer(blankCalls),
    );

    expect(result?.rules).toEqual([]);
    expect(result?.candidates).toEqual({});
    expect(result?.code).toContain('className":""');
  });

  it('emits an empty class when props has no static style arguments', async () => {
    const input =
      "import { create, props } from '@cssxio/cssx'; const styles = create({ root: 'p-4' }); export const value = props();";
    const calls = staticCalls(input, []);
    calls[1] = { ...calls[1]!, styleNames: undefined };
    const result = await transformNativeStaticCreateModule(
      input,
      '/project/page.tsx',
      '/project',
      { mode: 'production', sourceMap: false },
      createClassNameAllocator(),
      analyzer(calls),
    );

    expect(result?.rules).toEqual([]);
    expect(result?.candidates).toEqual({});
    expect(result?.code).toContain('className":""');
  });

  it('falls back on unsupported, unsafe, or spanless native output', async () => {
    const supportedCalls = staticCalls();
    const options = { mode: 'production' as const, sourceMap: false };
    const allocate = () => createClassNameAllocator();
    const run = (calls: readonly NativeCssxCall[]) =>
      transformNativeStaticCreateModule(source, '/project/page.tsx', '/project', options, allocate(), analyzer(calls));

    await expect(run([])).resolves.toBeNull();
    await expect(run([{ ...supportedCalls[0]!, fastTransformSafe: false }, supportedCalls[1]!])).resolves.toBeNull();
    await expect(run([{ ...supportedCalls[0]!, staticCreate: false }, supportedCalls[1]!])).resolves.toBeNull();
    await expect(run([supportedCalls[0]!, { ...supportedCalls[1]!, staticProps: false }])).resolves.toBeNull();
    await expect(run([{ ...supportedCalls[0]!, startUtf16: undefined }, supportedCalls[1]!])).resolves.toBeNull();
    await expect(run([supportedCalls[0]!, { ...supportedCalls[1]!, endUtf16: undefined }])).resolves.toBeNull();
    await expect(run([{ ...supportedCalls[0]!, startUtf16: -1 }, supportedCalls[1]!])).resolves.toBeNull();
    await expect(
      run([{ ...supportedCalls[0]!, endUtf16: supportedCalls[0]!.startUtf16! - 1 }, supportedCalls[1]!]),
    ).resolves.toBeNull();
    await expect(run([{ ...supportedCalls[0]!, styles: [] }, supportedCalls[1]!])).resolves.toBeNull();
    await expect(run([{ ...supportedCalls[0]!, entryPoint: 'sx' }, supportedCalls[1]!])).resolves.toBeNull();
    await expect(run([supportedCalls[0]!, { ...supportedCalls[1]!, styleNames: ['missing'] }])).resolves.toBeNull();
    await expect(run([...supportedCalls, { ...supportedCalls[1]!, entryPoint: 'sx' }])).resolves.toBeNull();
    await expect(run([supportedCalls[1]!])).resolves.toBeNull();
    await expect(run([supportedCalls[0]!])).resolves.toBeNull();
    await expect(run([supportedCalls[0]!, { ...supportedCalls[0]! }, supportedCalls[1]!])).resolves.toBeNull();
  });
});
