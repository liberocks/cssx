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
