import { transformSync } from '@babel/core';
import { describe, expect, it } from 'vitest';
import { compileUtilities, createSelectorAliases } from '@cssxio/compiler';
import cssxBabelPlugin from '../src/index';

function transform(source: string, options: Parameters<typeof cssxBabelPlugin>[1] = {}) {
  return transformSync(source, {
    babelrc: false,
    configFile: false,
    plugins: [[cssxBabelPlugin, options]],
  });
}

describe('CSSX Babel plugin', () => {
  it('extracts create styles and folds fully static props calls', () => {
    const result = transformSync(
      `
        import * as cssx from '@cssxio/cssx';
        const styles = cssx.create({ root: 'p-5', alert: 'bg-red-500' });
        export const rootProps = cssx.props(styles.root, styles.alert);
      `,
      {
        babelrc: false,
        configFile: false,
        plugins: [cssxBabelPlugin],
      },
    );

    if (!result) {
      throw new Error('Babel did not return a transform result.');
    }
    const metadata = (
      result.metadata as unknown as { readonly cssx: { readonly candidates: Readonly<Record<string, string>> } }
    ).cssx;
    expect(result?.code).not.toContain('@cssxio/cssx');
    expect(result?.code).toContain('className');
    expect(Object.keys(metadata.candidates)).toHaveLength(2);
    expect(Object.values(metadata.candidates).every((className) => /^s[0-9A-Za-z]+x$/.test(className))).toBe(true);
  });

  it('interns repeated static props output without retaining the runtime import', () => {
    const result = transform(`
      import * as cssx from '@cssxio/cssx';
      const styles = cssx.create({ one: 'flex p-4', two: 'flex p-5', three: 'flex p-6', four: 'flex p-7' });
      export const props = [cssx.props(styles.one), cssx.props(styles.two), cssx.props(styles.three), cssx.props(styles.four)];
    `);

    expect(result?.code).toContain('_cssxProps');
    expect(result?.code).not.toContain('@cssxio/cssx');
  });

  it('keeps development composites stable across CSS-only edits', () => {
    const transform = (utility: string) =>
      transformSync(
        `import * as cssx from '@cssxio/cssx'; const styles = cssx.create({ root: '${utility}' }); export const props = cssx.props(styles.root);`,
        {
          babelrc: false,
          configFile: false,
          filename: '/project/styles.ts',
          plugins: [[cssxBabelPlugin, { stableClassNames: true }]],
        },
      );
    const first = transform('bg-red-500');
    const second = transform('bg-blue-500');
    const className = (result: NonNullable<typeof first>) => result.code?.match(/className: "(d[^"]+)"/)?.[1];
    const metadata = (result: NonNullable<typeof first>) =>
      (result.metadata as unknown as { readonly cssx: { readonly cssOnlySignature: string } }).cssx;

    expect(className(first!)).toBe(className(second!));
    expect(metadata(first!).cssOnlySignature).toBe(metadata(second!).cssOnlySignature);
  });

  it('interns repeated runtime records for dynamic style access', () => {
    const result = transformSync(
      `import { create, props } from '@cssxio/cssx'; const styles = create({ first: 'flex items-center', second: 'flex items-center' }); export const value = props(styles[variant]);`,
      { babelrc: false, configFile: false, plugins: [cssxBabelPlugin] },
    );

    expect(result?.code).toMatch(/const _c\d* = \[/);
    expect(result?.code?.match(/_:\s*\[_c/g) ?? []).toHaveLength(2);
  });

  it('reports invalid utility strings at the source location', () => {
    expect(() =>
      transformSync(`import * as cssx from '@cssxio/cssx'; cssx.create({ root: 'nope-value' });`, {
        babelrc: false,
        configFile: false,
        plugins: [cssxBabelPlugin],
      }),
    ).toThrow('cannot classify utility');
  });

  it('keeps production transform diagnostics concise', () => {
    const previousEnvironment = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      expect(() =>
        transformSync(`import * as cssx from '@cssxio/cssx'; cssx.create({ root: 'nope-value' });`, {
          babelrc: false,
          configFile: false,
          plugins: [cssxBabelPlugin],
        }),
      ).toThrow('cannot classify utility');
      try {
        transformSync(`import * as cssx from '@cssxio/cssx'; cssx.create({ root: 'nope-value' });`, {
          babelrc: false,
          configFile: false,
          plugins: [cssxBabelPlugin],
        });
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).not.toContain('> 1 |');
      }
    } finally {
      process.env.NODE_ENV = previousEnvironment;
    }
  });

  it('supports default imports and immutable local utility constants', () => {
    const result = transformSync(
      `
        import cssx from '@cssxio/cssx';
        const utility = 'p-5';
        export const styles = cssx.create({ root: utility });
      `,
      { babelrc: false, configFile: false, plugins: [cssxBabelPlugin] },
    );

    expect(result?.code).not.toContain('@cssxio/cssx');
    expect(result?.code).toContain('$$css');
  });

  it('uses import bindings instead of matching shadowed local names', () => {
    const result = transformSync(
      `
        import { create } from '@cssxio/cssx';
        function demo(create) { return create({ root: 'p-5' }); }
        export { demo };
      `,
      { babelrc: false, configFile: false, plugins: [cssxBabelPlugin] },
    );

    expect(result?.code).toContain('return create({');
    expect(result?.code).not.toContain("from '@cssxio/cssx'");
  });

  it('supports aliased imports and rejects module-unsafe call shapes', () => {
    const transformed = transformSync(
      `import { create as makeStyles } from '@cssxio/cssx'; export const styles = makeStyles({ root: 'p-5' });`,
      { babelrc: false, configFile: false, plugins: [cssxBabelPlugin] },
    );
    expect(transformed?.code).not.toContain('@cssxio/cssx');

    expect(() =>
      transformSync(`import * as cssx from '@cssxio/cssx'; function demo() { return cssx.create({ root: 'p-5' }); }`, {
        babelrc: false,
        configFile: false,
        plugins: [cssxBabelPlugin],
      }),
    ).toThrow('must be declared at module scope');

    expect(() =>
      transformSync(`import * as cssx from '@cssxio/cssx'; cssx['create']({ root: 'p-5' });`, {
        babelrc: false,
        configFile: false,
        plugins: [cssxBabelPlugin],
      }),
    ).toThrow('must use dot notation');
  });

  it('emits metadata only for statically reachable style keys and retains dynamic access conservatively', () => {
    const staticResult = transformSync(
      `import * as cssx from '@cssxio/cssx'; const styles = cssx.create({ used: 'p-5', unused: 'bg-red-500' }); export const props = cssx.props(styles.used);`,
      { babelrc: false, configFile: false, plugins: [cssxBabelPlugin] },
    );
    const staticMetadata = (
      staticResult?.metadata as unknown as { readonly cssx: { readonly candidates: Record<string, string> } }
    ).cssx;
    expect(Object.keys(staticMetadata.candidates)).toEqual(['p-5']);

    const dynamicResult = transformSync(
      `import * as cssx from '@cssxio/cssx'; const styles = cssx.create({ first: 'p-5', second: 'bg-red-500' }); export const style = styles[variant];`,
      { babelrc: false, configFile: false, plugins: [cssxBabelPlugin] },
    );
    const dynamicMetadata = (
      dynamicResult?.metadata as unknown as { readonly cssx: { readonly candidates: Record<string, string> } }
    ).cssx;
    expect(Object.keys(dynamicMetadata.candidates).sort()).toEqual(['bg-red-500', 'p-5']);
  });

  it('folds static props using surviving atoms when a later style partially overrides an earlier utility', () => {
    const result = transformSync(
      `import * as cssx from '@cssxio/cssx'; const styles = cssx.create({ horizontal: 'px-2', right: 'pr-1' }); export const props = cssx.props(styles.horizontal, styles.right);`,
      { babelrc: false, configFile: false, plugins: [cssxBabelPlugin] },
    );
    const className = (result?.code ?? '').match(/className: "([^"]+)"/)?.[1] ?? '';

    expect(className.split(' ')).toHaveLength(1);
  });

  it('extracts inline sx utility strings while preserving dynamic conditions', () => {
    const result = transformSync(
      `import { sx } from '@cssxio/cssx'; export const staticClass = sx('p-4', ['bg-red-500']); export const dynamicClass = sx('inline-flex', disabled && 'opacity-50');`,
      { babelrc: false, configFile: false, plugins: [cssxBabelPlugin] },
    );
    const metadata = (result?.metadata as unknown as { readonly cssx: { readonly candidates: Record<string, string> } })
      .cssx;

    expect(result?.code).toContain('export const staticClass = "');
    const staticClass = (result?.code ?? '').match(/staticClass = "([^"]+)"/)?.[1] ?? '';
    expect(staticClass.split(' ')).toHaveLength(1);
    expect(result?.code).toContain('sx("');
    expect(result?.code).toContain('disabled && "');
    expect(Object.keys(metadata.candidates).sort()).toEqual(['bg-red-500', 'inline-flex', 'opacity-50', 'p-4']);
  });

  it('does not recompile generated sx class names when Babel transforms a module twice', () => {
    const first = transform(`import { sx } from '@cssxio/cssx'; export const className = sx('p-4', active && 'opacity-50');`);

    expect(() => transform(first?.code ?? '')).not.toThrow();
  });

  it('handles static edge forms while leaving unsupported dynamic calls intact', () => {
    const staticResult = transformSync(
      `import { create, sx } from '@cssxio/cssx'; const styles = create({ 1: 'p-4' }); export const value = sx(false, null, active ? 'bg-red-500' : 'bg-blue-500');`,
      { babelrc: false, configFile: false, plugins: [cssxBabelPlugin] },
    );
    expect(staticResult?.code).not.toContain('$$css: 2');
    expect(staticResult?.code).toContain('active ? "');

    const dynamicResult = transformSync(
      `import { props } from '@cssxio/cssx'; export const output = props(...items);`,
      { babelrc: false, configFile: false, plugins: [cssxBabelPlugin] },
    );
    expect(dynamicResult?.code).toContain('props(...items)');

    expect(() =>
      transformSync(
        `import { create } from '@cssxio/cssx'; let value = 'p-4'; value = 'p-5'; create({ root: value });`,
        {
          babelrc: false,
          configFile: false,
          plugins: [cssxBabelPlugin],
        },
      ),
    ).toThrow('static utility string');

    expect(() =>
      transformSync(`import { create } from '@cssxio/cssx'; create({ root() { return 'p-4'; } });`, {
        babelrc: false,
        configFile: false,
        plugins: [cssxBabelPlugin],
      }),
    ).toThrow('only supports plain object properties');
  });

  it('folds nested static props while preserving unsupported props arguments', () => {
    const folded = transformSync(
      `import { create, props } from '@cssxio/cssx'; const styles = create({ first: 'p-4', second: 'bg-red-500' }); export const value = props([styles.first, false, styles.second]);`,
      { babelrc: false, configFile: false, plugins: [cssxBabelPlugin] },
    );
    expect(folded?.code).toContain('className');

    const preserved = transformSync(
      `import { create, props } from '@cssxio/cssx'; const styles = create({ first: 'p-4' }); export const value = props(styles['first']);`,
      { babelrc: false, configFile: false, plugins: [cssxBabelPlugin] },
    );
    expect(preserved?.code).toContain("props(styles['first'])");
  });

  it('retains reusable fragments and direct atomic classes in extracted metadata', async () => {
    const result = transformSync(
      `import * as cssx from '@cssxio/cssx'; const styles = cssx.create({ first: 'flex items-center justify-center font-semibold text-white w-[100px]', second: 'flex items-center justify-center font-semibold text-white w-[200px]', third: 'flex items-center justify-center font-semibold text-white w-[300px]', fourth: 'flex items-center justify-center font-semibold text-white w-[400px]' }); export { styles };`,
      { babelrc: false, configFile: false, plugins: [[cssxBabelPlugin, { reusabilityBudget: 'auto' }]] },
    );
    const metadata = (
      result?.metadata as unknown as {
        readonly cssx: {
          readonly candidates: Readonly<Record<string, string>>;
          readonly composites: Readonly<Record<string, readonly string[]>>;
          readonly atomicClasses: readonly string[];
        };
      }
    ).cssx;
    const css = (
      await compileUtilities(
        Object.keys(metadata.candidates),
        (candidate) => metadata.candidates[candidate] ?? candidate,
        '',
        createSelectorAliases(metadata.composites),
        new Set(metadata.atomicClasses),
      )
    ).css;

    expect(Object.keys(metadata.composites)).toHaveLength(5);
    expect(metadata.atomicClasses.length).toBeGreaterThan(0);
    expect(css).toContain(`.${Object.keys(metadata.composites)[0]}`);
  });

  it('snapshots transformed JavaScript and extracted CSS metadata for custom themes, variants, and arbitrary properties', async () => {
    const theme = '@theme { --spacing: 2px; --color-brand: #123456; --breakpoint-tablet: 50rem; }';
    const result = transformSync(
      `import * as cssx from '@cssxio/cssx'; const styles = cssx.create({ root: 'tablet:hover:bg-brand px-4 [mask-type:luminance]' }); export const props = cssx.props(styles.root);`,
      { babelrc: false, configFile: false, plugins: [[cssxBabelPlugin, { theme }]] },
    );
    if (!result) {
      throw new Error('Babel did not return a transform result.');
    }
    const metadata = (
      result.metadata as unknown as {
        readonly cssx: {
          readonly candidates: Readonly<Record<string, string>>;
          readonly composites: Readonly<Record<string, readonly string[]>>;
          readonly atomicClasses: readonly string[];
        };
      }
    ).cssx;
    const candidates = metadata.candidates;
    const css = (
      await compileUtilities(
        Object.keys(candidates),
        (candidate) => candidates[candidate] ?? candidate,
        theme,
        createSelectorAliases(metadata.composites),
        new Set(metadata.atomicClasses),
      )
    ).css;

    const foldedClass = (result.code ?? '').match(/className: "([^"]+)"/)?.[1] ?? '';
    const atomicClasses = Object.values(candidates).flatMap((className) => className.split(' '));
    expect(foldedClass.split(' ')).toHaveLength(1);
    expect(result.code).not.toContain('$$css: 2');
    expect(Object.keys(metadata.composites)).toEqual([foldedClass]);
    expect(metadata.atomicClasses).toEqual([]);
    expect(css).toContain(`.${foldedClass}`);
    expect(atomicClasses.every((className) => !css.includes(`.${className}`))).toBe(true);
    expect(css).toContain('padding-left:calc(2px * 4)');
    expect(css).toContain('padding-right:calc(2px * 4)');
    expect(css).toContain('mask-type:luminance');
    expect(css).toContain('@media (width >= 50rem)');
    expect(css).toContain('@media (hover: hover)');
    expect(css).toContain('background-color:#123456');
  });

  it('handles remaining supported and rejected source forms conservatively', () => {
    const runtime = transform(
      `import { create } from '@cssxio/cssx'; const styles = create({ root: 'p-4', duplicate: 'p-4', other: 'bg-red-500' }); export const values = [styles.root, styles['other'], styles[variant], styles];`,
    );
    expect(runtime?.code).toContain('styles.root');
    expect(runtime?.code).toContain("styles['other']");

    const stable = transform(
      `import * as cssx from '@cssxio/cssx'; cssx.create({ lone: 'p-4' }); const styles = cssx.create({ root: 'p-4', alert: 'bg-red-500' }); export const props = cssx.props(styles.root, styles.alert); export const classes = cssx.sx('p-4');`,
      { stableClassNames: true },
    );
    expect(stable?.code).toContain('className: "d');
    expect(stable?.code).toContain('export const classes = "d');

    const sx = transform(
      `import { sx } from '@cssxio/cssx'; export const empty = sx('   '); export const nested = sx([active && 'p-4', false, enabled ? 'bg-red-500' : 'bg-blue-500']); export const preserved = sx([, 'p-4']); export const spread = sx(...items); export const mixed = sx(['p-4', active]); export const logical = sx(active && dynamic); export const rejectedLogical = sx(active && [, 'p-4']); export const conditional = sx(active ? 'p-4' : dynamic); export const rejectedConditional = sx(active ? 'p-4' : [, 'bg-red-500']); export const value = sx(true);`,
    );
    expect(sx?.code).toContain('export const empty = ""');
    expect(sx?.code).toContain('active && "');
    expect(sx?.code).toContain("sx([, 'p-4'])");
    expect(sx?.code).toContain('sx(...items)');
    expect(sx?.code).toContain('active && dynamic');
    expect(sx?.code).toContain('active ? "');

    const props = transform(
      `import { create, props } from '@cssxio/cssx'; const styles = create({ root: 'p-4' }); export const ignored = props(false, null); export const missing = props(styles.missing); export const nestedMissing = props([styles.missing]); export const hole = props([, styles.root]); export const nestedSpread = props([...items]); export const value = props(true);`,
    );
    expect(props?.code).toContain('className: ""');
    expect(props?.code).toContain('props(styles.missing)');
    expect(props?.code).toContain('props([, styles.root])');
    expect(props?.code).toContain('props([...items])');
    expect(props?.code).toContain('props(true)');

    const exportedRuntime = transform(
      `import { create } from '@cssxio/cssx'; export const styles = create({ first: 'flex items-center', second: 'flex items-center' }); export const value = styles[variant];`,
    );
    expect(exportedRuntime?.code).toMatch(/const _c\d* = \[/);

    const atomic = transform(
      `import { create, props } from '@cssxio/cssx'; const styles = create({ root: 'p-4' }); export const value = props(styles.root);`,
      { reusabilityBudget: 100 },
    );
    const atomicMetadata = (
      atomic?.metadata as unknown as { readonly cssx: { readonly atomicClasses: readonly string[] } }
    ).cssx;
    expect(atomicMetadata.atomicClasses.length).toBeGreaterThan(0);

    const customSource = transform(
      `import { create } from 'custom-cssx'; export const styles = create({ root: 'p-4' });`,
      { importSource: 'custom-cssx' },
    );
    expect(customSource?.code).not.toContain('custom-cssx');

    const unrelated = transform(
      `import * as cssx from 'other'; export const styles = cssx.create({ root: 'p-4' }); cssx['unknown']();`,
    );
    expect(unrelated?.code).toContain("from 'other'");

    const nonNamespace = transform(
      `import { create as cssx } from '@cssxio/cssx'; export const styles = cssx.create({ root: 'p-4' });`,
    );
    expect(nonNamespace?.code).toContain('cssx.create');

    const stringNamedImport = transform(
      `import { 'create' as makeStyles } from '@cssxio/cssx'; export const styles = makeStyles({ root: 'p-4' });`,
    );
    expect(stringNamedImport?.code).not.toContain('@cssxio/cssx');

    const throwingAllocator = {
      allocate(): never {
        throw 'allocator failed';
      },
      reserve() {},
    };
    expect(() =>
      transform(`import { create } from '@cssxio/cssx'; create({ root: 'p-4' });`, {
        classNameAllocator: throwingAllocator,
      }),
    ).toThrow('Unable to compile CSSX styles.');
    expect(() =>
      transform(`import { sx } from '@cssxio/cssx'; sx('p-4');`, { classNameAllocator: throwingAllocator }),
    ).toThrow('Unable to compile CSSX sx() utilities.');
    expect(() => transform(`import { sx } from '@cssxio/cssx'; sx('nope-value');`)).toThrow('cannot classify utility');

    for (const source of [
      `import { create } from '@cssxio/cssx'; create();`,
      `import { create } from '@cssxio/cssx'; create({ root: false });`,
      `import { create } from '@cssxio/cssx'; const utility = false; create({ root: utility });`,
      `import { create } from '@cssxio/cssx'; create({ [key]: 'p-4' });`,
      `import { create } from '@cssxio/cssx'; create({ 1n: 'p-4' });`,
      `import * as cssx from '@cssxio/cssx'; cssx['props']();`,
      `import * as cssx from '@cssxio/cssx'; cssx['sx']();`,
    ]) {
      expect(() => transform(source)).toThrow();
    }
  });
});
