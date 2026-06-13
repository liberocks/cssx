import { describe, expect, it } from 'vitest';
import {
  compileStyleMap,
  compileStyleMaps,
  compileStyleRecords,
  compileUtilities,
  composeCompiledStyles,
  createClassNameAllocator,
  describeUtilityRecipe,
  mergeCompiledStyles,
  serializeCss,
} from '../src/index';
import { parseTheme } from '../src/theme';

describe('CSSX compiler', () => {
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

  it('assigns collision-free sequential class names, including composite classes', async () => {
    const result = await compileStyleMaps(
      {
        button: { base: 'px-2 bg-red-500' },
        card: { base: 'p-4 text-white' },
      },
      { className: { variant: 'serial', prefix: 'u-', suffix: '-x' } },
    );
    const classes = [
      ...Object.values(result.styleMaps.button?.classes ?? {}).flatMap((value) => value.split(' ')),
      ...Object.values(result.styleMaps.card?.classes ?? {}).flatMap((value) => value.split(' ')),
      ...Object.values(result.styleMaps.button?.classNames ?? {}),
      ...Object.values(result.styleMaps.card?.classNames ?? {}),
    ];
    const uniqueClasses = [...new Set(classes)];
    const serials = uniqueClasses.map((className) => className.slice(2, -2)).sort();

    expect(uniqueClasses.every((className) => /^u-[0-9A-Za-z]+-x$/.test(className))).toBe(true);
    expect(serials).toEqual(['0', '1', '2', '3', '4', '5', '6']);
    expect(serializeCss(result.rules)).toContain('.u-0-x');
  });

  it('continues serial names through lower- and uppercase letters before base-62 rollover', async () => {
    const result = await compileStyleMap(
      Object.fromEntries(Array.from({ length: 63 }, (_, index) => [`style${index}`, `p-[${index + 1}px]`])),
      { className: { variant: 'serial', prefix: 'u-' } },
    );
    const classes = new Set(Object.values(result.classes));

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

  it('rejects invalid reusability budgets', () => {
    expect(() => compileStyleRecords({ root: 'p-4' }, { reusabilityBudget: -1 })).toThrow('reusabilityBudget');
    expect(() => compileStyleRecords({ root: 'p-4' }, { reusabilityBudget: 101 })).toThrow('reusabilityBudget');
  });

  it('shares one serial namespace across independent compilations and compositions', () => {
    const classNameAllocator = createClassNameAllocator();
    const first = compileStyleRecords({ padding: 'p-4' }, { classNameAllocator });
    const second = compileStyleRecords({ color: 'bg-red-500' }, { classNameAllocator });
    const padding = first.styles.padding;
    const color = second.styles.color;
    if (!padding || !color) {
      throw new Error('Expected compiled styles.');
    }
    const composition = composeCompiledStyles([padding, color], classNameAllocator);

    expect(first.classes['p-4']).toBe('s0x');
    expect(first.classNames.padding).toBe('s1x');
    expect(second.classes['bg-red-500']).toBe('s2x');
    expect(second.classNames.color).toBe('s3x');
    expect(composition.className).toBe('s4x');
  });

  it('supports fixed-length random names with shared prefixes and suffixes', async () => {
    const result = await compileStyleMap(
      { root: 'px-2 bg-red-500 hover:text-white' },
      { className: { variant: 'random', prefix: 'app_', suffix: '_v', length: 4 } },
    );
    const classes = [
      ...Object.values(result.classes).flatMap((value) => value.split(' ')),
      ...Object.values(result.classNames),
    ];

    expect(classes.every((className) => /^app_[0-9a-z]{4}_v$/.test(className))).toBe(true);
    expect(new Set(classes).size).toBe(classes.length);
    expect(serializeCss(result.rules)).toContain(`.${result.classNames.root}`);
  });

  it('rejects unsafe naming options and random lengths that cannot avoid collisions', async () => {
    await expect(compileStyleMaps({ root: { base: 'p-4 bg-red-500' } }, { className: { prefix: '' } })).rejects.toThrow(
      'prefix',
    );
    await expect(
      compileStyleMaps({ root: { base: 'p-4' } }, { className: { variant: 'serial', length: 3 } }),
    ).rejects.toThrow('only supported');
    await expect(
      compileStyleMaps(
        {
          root: Object.fromEntries(Array.from({ length: 37 }, (_, index) => [`style${index}`, `p-[${index + 1}px]`])),
        },
        { className: { variant: 'random', length: 1 } },
      ),
    ).rejects.toThrow('cannot name every generated class');
  });

  it('applies variants to every atomic and composite selector', async () => {
    const result = await compileUtilities(
      ['hover:bg-red-500', '[&>span]:text-white'],
      (candidate) => (candidate.startsWith('hover:') ? 'x-hover-atom' : 'x-child-atom'),
      '',
      {
        'x-hover-atom': ['x-hover-composite'],
        'x-child-atom': ['x-child-composite'],
      },
    );

    expect(result.css).toContain('.x-hover-atom:hover,.x-hover-composite:hover');
    expect(result.css).toContain('.x-child-atom>span,.x-child-composite>span');
  });

  it('describes each recipe with its atoms, semantic writes, and required resources', () => {
