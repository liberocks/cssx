import { describe, expect, it } from 'vitest';

import { serializeCss } from '../css/serialize-css';
import { compileStyleMap } from './compile-style-map';
import { mergeCompiledStyles } from './merge-compiled-styles';

describe('compileStyleMap', () => {
  it('compiles one style map into records and CSS rules', async () => {
    const result = await compileStyleMap({ root: 'p-4 bg-red-500' });

    expect(result.rules).toHaveLength(1);
    expect(result.rules[0]!.className).toMatch(/^cssx-/);
    expect(result.rules[0]!.css).toContain('padding');
    expect(result.styles.root).toBeDefined();
    expect(result.classNames.root).toBeDefined();
    expect(result.composites).toBeDefined();
  });

  it('returns no rules for an empty style map', async () => {
    const result = await compileStyleMap({});

    expect(result.rules).toEqual([]);
    expect(result.styles).toEqual({});
    expect(result.classes).toEqual({});
  });

  it('emits one composite class for a complete static style', async () => {
    const result = await compileStyleMap({ root: 'relative flex p-5 hover:bg-red-500' });
    const className = result.classNames.root ?? '';
    const css = serializeCss(result.rules);

    expect(className).toMatch(/^s[0-9A-Za-z]+x$/);
    expect(className.split(' ')).toHaveLength(1);
    expect(css).toContain(`.${className}`);
    expect(css).toContain(`.${className}:hover`);
    expect(css).toContain('position:relative');
    expect(css).toContain('display:flex');
    expect(css).toContain('padding:calc(0.25rem * 5)');
  });

  it('preserves group markers while compiling group variants and label layout utilities', async () => {
    const result = await compileStyleMap({
      label: 'group flex flex-nowrap items-center gap-2 py-0.5 whitespace-nowrap text-sm text-gray-700 sm:text-base',
      icon: 'group-hover:text-emerald-500',
      peer: 'peer',
    });
    const labelStyle = result.styles.label!;
    const className = result.classNames.label ?? '';
    const css = serializeCss(result.rules);

    expect(result.classes.group).toBe('group');
    expect(result.classes.peer).toBe('peer');
    expect(className.split(' ')).toContain('group');
    expect(mergeCompiledStyles([labelStyle]).split(' ')).toContain('group');
    expect(result.classNames.peer).toBe('peer');
    expect(css).toContain('.group:hover');
    expect(css).not.toContain('.group{');
    expect(css).toContain('display:flex');
    expect(css).toContain('flex-wrap:nowrap');
    expect(css).toContain('align-items:center');
    expect(css).toContain('white-space:nowrap');
  });

  it('preserves named structural markers and compiles fluid typography inside one style', async () => {
    const result = await compileStyleMap({
      root: 'group group-field-group group-field-label peer-field-label flex items-baseline ~text-3xl/4xl',
    });
    const className = result.classNames.root ?? '';
    const css = serializeCss(result.rules);

    expect(result.classes['group-field-group']).toBe('group-field-group');
    expect(className.split(' ')).toContain('group-field-group');
    expect(className.split(' ')).toContain('group-field-label');
    expect(className.split(' ')).toContain('peer-field-label');
    expect(className.split(' ')).toContain('group');
    expect(css).toContain('font-size:clamp(1.875rem');
    expect(css).toContain('line-height:clamp(2.25rem');
  });

  it('continues serial names through lower- and uppercase letters before base-62 rollover', async () => {
    const result = await compileStyleMap(
      Object.fromEntries(Array.from({ length: 63 }, (_, index) => [`style${index}`, `p-[${index + 1}px]`])),
      { className: { variant: 'serial', prefix: 'u-' } },
    );
    const classes = new Set([...Object.values(result.classes), ...Object.values(result.classNames)]);

    expect(classes).toContain('u-0x');
    expect(classes).toContain('u-9x');
    expect(classes).toContain('u-ax');
    expect(classes).toContain('u-zx');
    expect(classes).toContain('u-Ax');
    expect(classes).toContain('u-Zx');
    expect(classes).toContain('u-10x');
  });

  it('uses serial names with s and x defaults', async () => {
    const result = await compileStyleMap({ root: 'p-4 bg-red-500' }, { className: { variant: 'serial' } });
    const classes = [
      ...Object.values(result.classes).flatMap((value) => value.split(' ')),
      ...Object.values(result.classNames),
    ];

    expect(classes.every((className) => /^s[0-9A-Za-z]+x$/.test(className))).toBe(true);
  });

  it('supports blank class-name affixes when configured', async () => {
    const result = await compileStyleMap(
      { root: 'p-4 bg-red-500' },
      { className: { variant: 'serial', prefix: '', suffix: '' } },
    );
    const classes = [...Object.values(result.classes), ...Object.values(result.classNames)];

    expect(classes.every((className) => /^[0-9]+$/.test(className))).toBe(true);
    expect(serializeCss(result.rules)).toContain('.\\30 ');
  });

  it('keeps one complete class per style at a zero reusability budget', async () => {
    const result = await compileStyleMap(
      {
        first: 'flex items-center justify-center w-[100px]',
        second: 'flex items-center justify-center w-[200px]',
      },
      { reusabilityBudget: 0 },
    );

    expect(result.classNames.first?.split(' ')).toHaveLength(1);
    expect(result.classNames.second?.split(' ')).toHaveLength(1);
  });

  it('uses only winning atomic classes at a full reusability budget', async () => {
    const result = await compileStyleMap(
      { first: 'flex items-center px-4', second: 'flex items-center px-6' },
      { reusabilityBudget: 100 },
    );
    const first = result.styles.first;
    const second = result.styles.second;
    if (!first || !second) {
      throw new Error('Expected compiled styles.');
    }

    expect(result.classNames.first?.split(' ').sort()).toEqual(mergeCompiledStyles([first]).split(' ').sort());
    expect(result.classNames.second?.split(' ').sort()).toEqual(mergeCompiledStyles([second]).split(' ').sort());
    expect(result.composites).toEqual({});
  });

  it('automatically extracts repeated utility groups and retains residual aliases', async () => {
    const result = await compileStyleMap({
      first: 'flex items-center justify-center font-semibold text-white w-[100px]',
      second: 'flex items-center justify-center font-semibold text-white w-[200px]',
      third: 'flex items-center justify-center font-semibold text-white w-[300px]',
      fourth: 'flex items-center justify-center font-semibold text-white w-[400px]',
    });

    const first = result.classNames.first?.split(' ') ?? [];
    const second = result.classNames.second?.split(' ') ?? [];
    expect(first).toHaveLength(2);
    expect(second).toHaveLength(2);
    expect(first[0]).toBe(second[0]);
    expect(Object.keys(result.composites)).toHaveLength(5);
  });
});
