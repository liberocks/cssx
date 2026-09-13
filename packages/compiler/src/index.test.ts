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
  parseTheme,
  serializeCss,
  validateUtilityCandidate,
} from './index';

describe('CSSX compiler', () => {
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

  it('validates standalone candidates and returns an empty record map for empty input', () => {
    expect(() => validateUtilityCandidate('p-4', parseTheme())).not.toThrow();
    expect(compileStyleRecords({})).toEqual({
      styles: {},
      classes: {},
      candidates: {},
      classNames: {},
      composites: {},
    });
  });

  it('returns no CSS for empty single and multiple style maps', async () => {
    await expect(compileStyleMap({})).resolves.toMatchObject({ rules: [], styles: {} });
    await expect(compileStyleMaps({ empty: {} })).resolves.toMatchObject({ rules: [], styleMaps: { empty: {} } });
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

    const classNames = [
      first.classes['p-4'],
      first.classNames.padding,
      second.classes['bg-red-500'],
      second.classNames.color,
      composition.className,
    ].filter((className): className is string => !!className);
    expect(classNames.every((className) => /^s[0-9A-Za-z]+x$/.test(className))).toBe(true);
    expect(composition.className).toBeTruthy();
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
    await expect(
      compileStyleMaps({ root: { base: 'p-4 bg-red-500' } }, { className: { prefix: '9' } }),
    ).rejects.toThrow('prefix');
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

  it('applies composite selector aliases to fallback utilities', async () => {
    const result = await compileUtilities(
      ['-bg-conic-30'],
      () => 'x-fallback-atom',
      '',
      { 'x-fallback-atom': ['x-fallback-composite'] },
      new Set(['x-fallback-composite']),
    );

    expect(result.css).toContain('.x-fallback-composite{');
    expect(result.css).not.toContain('.x-fallback-atom{');
  });

  it('describes each recipe with its atoms, semantic writes, and required resources', () => {
    const theme = parseTheme(
      '@theme { --animate-wiggle: wiggle 1s linear infinite; @keyframes wiggle { to { transform: rotate(1deg); } } }',
    );
    const animation = describeUtilityRecipe('animate-wiggle', theme);
    const scrollbar = describeUtilityRecipe('scrollbar-thumb-red-500', theme);

    expect(animation.atoms).toHaveLength(1);
    expect(animation.resources.keyframes).toEqual(['wiggle']);
    expect(animation.writes).toEqual([{ group: 'animation', conflicts: ['animation'] }]);
    expect(scrollbar.resources.properties).toEqual(['--cssx-scrollbar-thumb']);
    expect(scrollbar.writes[0]).toMatchObject({ group: 'scrollbar-thumb' });
  });

  it('keeps safe same-domain declaration sets bundled into one generated class', async () => {
    const result = await compileStyleMap({ clipped: 'truncate', visible: 'text-clip' });
    const clipped = result.styles.clipped;
    const visible = result.styles.visible;
    if (!clipped || !visible) {
      throw new Error('Expected compiled styles.');
    }

    expect(result.classes.truncate?.split(' ')).toHaveLength(1);
    expect(serializeCss(result.rules)).toContain('overflow:hidden;text-overflow:ellipsis;white-space:nowrap');
    expect(mergeCompiledStyles([clipped, visible])).toBe(`${result.classes.truncate} ${result.classes['text-clip']}`);
  });

  it('compiles compiled styles and generated classes through the CSSX utility pipeline', async () => {
    const result = await compileStyleMap({ root: 'p-5 bg-red-500' });
    const style = result.styles.root;
    if (!style) {
      throw new Error('Expected a compiled style.');
    }
    const css = serializeCss(result.rules);

    expect(mergeCompiledStyles([style])).toBe(`${result.classes['p-5']} ${result.classes['bg-red-500']}`);
    expect(css).toContain('padding:calc(0.25rem * 5)');
    expect(css).toContain('background-color:oklch(63.71% 0.237 25.331)');
    expect(css).not.toContain('.p-5');
    expect(css).not.toContain('.bg-red-500');
  });

  it('passes custom theme CSS to the candidate compiler', async () => {
    const result = await compileStyleMap(
      { root: 'tablet:p-5 bg-brand' },
      { theme: '@theme { --spacing: 2px; --color-brand: #123456; --breakpoint-tablet: 50rem; }' },
    );
    const css = serializeCss(result.rules);

    expect(css).toContain('padding:calc(2px * 5)');
    expect(css).toContain('background-color:#123456');
    expect(css).toContain('@media (width >= 50rem)');
  });

  it('deduplicates complete generated fragments and supports an outer layer', async () => {
    const first = await compileStyleMap({ first: 'p-5' });
    const second = await compileStyleMap({ second: 'p-5' });
    const css = serializeCss([...first.rules, ...second.rules], { layer: 'cssx' });

    expect(css).toMatch(/^@layer cssx\{/);
    expect(css.match(/padding:calc\(0\.25rem \* 5\)/g)).toHaveLength(1);
  });

  it('aggregates style maps into one CSS graph and retains each compiled map', async () => {
    const result = await compileStyleMaps(
      {
        button: { base: 'animate-wiggle p-4 scrollbar-thumb-red-500' },
        card: { base: 'animate-wiggle bg-red-500 scrollbar-thumb-red-500' },
      },
      {
        theme:
          '@theme { --animate-wiggle: wiggle 1s linear infinite; @keyframes wiggle { to { transform: rotate(1deg); } } }',
      },
    );
    const button = result.styleMaps.button?.styles.base;
    const card = result.styleMaps.card?.styles.base;
    if (!button || !card) {
      throw new Error('Expected both compiled style maps.');
    }
    const css = serializeCss(result.rules);

    expect(css.match(/@keyframes wiggle/g)).toHaveLength(1);
    expect(css.match(/animation:wiggle/g)).toHaveLength(1);
    expect(css.match(/@property --cssx-scrollbar-thumb/g)).toHaveLength(1);
    expect(mergeCompiledStyles([button])).toBeTruthy();
    expect(mergeCompiledStyles([card])).toBeTruthy();
  });

  it('lowers independently overridable multi-property utilities into generated atoms', async () => {
    const result = await compileStyleMap({ horizontal: 'px-2', right: 'pr-1' });
    const horizontal = result.styles.horizontal;
    const right = result.styles.right;
    if (!horizontal || !right) {
      throw new Error('Expected compiled styles.');
    }
    const horizontalAtoms = result.classes['px-2']?.split(' ') ?? [];
    const css = serializeCss(result.rules);

    expect(horizontalAtoms).toHaveLength(2);
    expect(mergeCompiledStyles([horizontal, right])).toBe(`${horizontalAtoms[0]} ${result.classes['pr-1']}`);
    expect(css).toContain(`.${horizontalAtoms[0]}`);
    expect(css).toContain(`.${horizontalAtoms[1]}`);
    expect(css).toContain('padding-left:calc(0.25rem * 2);');
    expect(css).toContain('padding-right:calc(0.25rem * 2);');
  });

  it('keeps transform channels independently overridable after atomic lowering', async () => {
    const result = await compileStyleMap({ base: 'scale-95', xAxis: 'scale-x-105' });
    const base = result.styles.base;
    const xAxis = result.styles.xAxis;
    if (!base || !xAxis) {
      throw new Error('Expected compiled transform styles.');
    }

    expect(result.classes['scale-95']?.split(' ')).toHaveLength(2);
    expect(mergeCompiledStyles([base, xAxis]).split(' ')).toHaveLength(2);
  });

  it('compiles arbitrary paint, gradient, decoration, and animation values', async () => {
    const result = await compileStyleMap({
      root: 'bg-linear-45 from-red-500/50 via-blue-500 to-green-500 text-[length:12px] bg-[image:url(icon.svg)] decoration-[length:2px] underline-offset-(--spacing) animate-[fade_1s_linear]',
    });
    const css = serializeCss(result.rules);

    expect(css).toContain('linear-gradient(45deg');
    expect(css).toContain('font-size:12px');
    expect(css).toContain('background-image:url(icon.svg)');
    expect(css).toContain('text-decoration-thickness:length:2px');
    expect(css).toContain('animation:fade_1s_linear');
  });
});
