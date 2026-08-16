import { transformSync } from '@babel/core';
import { describe, expect, it } from 'vitest';
import { compileUtilities, createSelectorAliases } from '@cssxio/compiler';
import cssxBabelPlugin from '../src/index';

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
});
