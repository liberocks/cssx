import { describe, expect, it } from 'vitest';
import { compileSourceUtilities, compileUtilities } from '../src/index';
import { applyVariants } from '../src/utility-variants';
import { parseTheme } from '../src/theme';

describe('CSSX utility compiler', () => {
  it('compiles source utility names into escaped CSS selectors', async () => {
    const result = await compileSourceUtilities(['p-5', '2xl:p-5', 'hover:bg-red-500', '[mask-type:luminance]']);

    expect(result.classes).toEqual({
      'p-5': 'p-5',
      '2xl:p-5': '2xl:p-5',
      'hover:bg-red-500': 'hover:bg-red-500',
      '[mask-type:luminance]': '[mask-type:luminance]',
    });
    expect(result.css).toContain('.p-5{padding:calc(0.25rem * 5);}');
    expect(result.css).toContain('.\\32 xl\\:p-5');
    expect(result.css).toContain('.hover\\:bg-red-500:hover');
    expect(result.css).toContain('.\\[mask-type\\:luminance\\]{mask-type:luminance;}');
  });

  it('compiles default utilities and rewrites only their root selectors', async () => {
    const result = await compileUtilities(
      ['p-5', 'hover:bg-red-500', 'sm:grid-cols-3'],
      (candidate) => `x-${candidate.replaceAll(/[^a-z0-9]/gi, '-')}`,
    );

    expect(result.css).toContain('.x-p-5');
    expect(result.css).toContain('.x-hover-bg-red-500:hover');
    expect(result.css).toContain('@media (width >= 40rem)');
    expect(result.css).not.toContain('.p-5');
    expect(result.css).toContain('padding:calc(0.25rem * 5)');
  });

  it('emits identical generated rules only once', async () => {
    const result = await compileUtilities(['block', '[display:block]'], () => 'x-display');

    expect(result.entries).toHaveLength(1);
    expect(result.css.match(/\.x-display\{display:block;\}/g)).toHaveLength(1);
  });

  it('compiles display table, flow-root, contents, and list-item primitives', async () => {
    const result = await compileUtilities(
      ['flow-root', 'contents', 'table', 'inline-table', 'table-header-group', 'table-row', 'table-cell', 'list-item'],
      (candidate) => `x-${candidate}`,
    );
    expect(result.css).toContain('.x-flow-root{display:flow-root;}');
    expect(result.css).toContain('.x-contents{display:contents;}');
    expect(result.css).toContain('.x-table-header-group{display:table-header-group;}');
    expect(result.css).toContain('.x-table-cell{display:table-cell;}');
  });

  it('compiles every exact semantic utility in the catalog', async () => {
    const result = await compileUtilities(
      ['collapse', 'transform', 'transform-none', 'blur'],
      (candidate) => `x-${candidate}`,
    );

    expect(result.css).toContain('.x-collapse{visibility:collapse;}');
    expect(result.css).toContain('.x-transform{transform:translate(0, 0);}');
    expect(result.css).toContain('.x-transform-none{transform:none;}');
    expect(result.css).toContain('.x-blur{--cssx-filter-blur:blur(8px);');
  });

  it('compiles every named border style and applies variants to it', async () => {
    const result = await compileUtilities(
      [
        'border-none',
        'border-hidden',
        'border-dotted',
        'border-dashed',
        'border-solid',
        'border-double',
        'hover:border-solid',
      ],
      (candidate) => `x-${candidate.replaceAll(/[^a-z0-9]/gi, '-')}`,
    );

    expect(result.css).toContain('.x-border-none{border-style:none;}');
    expect(result.css).toContain('.x-border-hidden{border-style:hidden;}');
    expect(result.css).toContain('.x-border-dotted{border-style:dotted;}');
    expect(result.css).toContain('.x-border-dashed{border-style:dashed;}');
    expect(result.css).toContain('.x-border-solid{border-style:solid;}');
    expect(result.css).toContain('.x-border-double{border-style:double;}');
    expect(result.css).toContain('.x-hover-border-solid:hover{border-style:solid;}');
  });

  it('compiles columns, breaks, float/clear, object position, sizing, and box-decoration layout utilities', async () => {
    const result = await compileUtilities(
      [
        'columns-3',
        'columns-[18rem]',
        'break-before-column',
        'break-inside-avoid',
        'float-start',
        'clear-both',
        'box-border',
        'box-decoration-clone',
        'object-top-right',
        'object-[25%_75%]',
      ],
      (candidate) => `x-${candidate.replaceAll(/[^a-z0-9]/gi, '-')}`,
    );
    expect(result.css).toContain('columns:3');
    expect(result.css).toContain('columns:18rem');
    expect(result.css).toContain('break-before:column');
    expect(result.css).toContain('break-inside:avoid');
    expect(result.css).toContain('float:inline-start');
    expect(result.css).toContain('clear:both');
    expect(result.css).toContain('box-sizing:border-box');
    expect(result.css).toContain('-webkit-box-decoration-break:clone;box-decoration-break:clone');
    expect(result.css).toContain('object-position:top right');
    expect(result.css).toContain('object-position:25% 75%');
  });

  it('accepts only the documented pagination-break variants', async () => {
    const result = await compileUtilities(
      ['break-before-left', 'break-after-avoid-page', 'break-inside-avoid-column'],
      (candidate) => `x-${candidate}`,
    );

    expect(result.css).toContain('break-before:left');
    expect(result.css).toContain('break-after:avoid-page');
    expect(result.css).toContain('break-inside:avoid-column');
    await expect(compileUtilities(['break-inside-page'], () => 'x-invalid')).rejects.toThrow('cannot compile utility');
    await expect(compileUtilities(['break-before-avoid-column'], () => 'x-invalid')).rejects.toThrow(
      'cannot compile utility',
    );
  });

  it('compiles text overflow, wrapping, hyphens, tab, list, and line-clamp typography utilities', async () => {
    const result = await compileUtilities(
      [
        'truncate',
        'text-clip',
        'hyphens-auto',
        'whitespace-pre-wrap',
        'text-balance',
        'wrap-break-word',
        'tab-8',
        'list-disc',
        'list-image-[url("/marker.svg")]',
        'line-clamp-3',
        'line-clamp-none',
      ],
      (candidate) => `x-${candidate.replaceAll(/[^a-z0-9]/gi, '-')}`,
    );
    expect(result.css).toContain('text-overflow:ellipsis');
    expect(result.css).toContain('text-overflow:clip');
    expect(result.css).toContain('-webkit-hyphens:auto;hyphens:auto');
    expect(result.css).toContain('white-space:pre-wrap');
    expect(result.css).toContain('text-wrap:balance');
    expect(result.css).toContain('overflow-wrap:break-word');
    expect(result.css).toContain('tab-size:8');
    expect(result.css).toContain('list-style-type:disc');
    expect(result.css).toContain('list-style-image:url("/marker.svg")');
    expect(result.css).toContain('-webkit-line-clamp:3');
    expect(result.css).toContain('-webkit-line-clamp:unset');
  });

  it('compiles sr-only and not-sr-only accessibility display resets', async () => {
    const result = await compileUtilities(['sr-only', 'not-sr-only'], (candidate) => `x-${candidate}`);
    expect(result.css).toContain(
      '.x-sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border-width:0;}',
    );
    expect(result.css).toContain(
      '.x-not-sr-only{position:static;width:auto;height:auto;padding:0;margin:0;overflow:visible;clip-path:none;white-space:normal;}',
    );
  });

  it('applies supported condition and attribute variants without preserving source utility selectors', async () => {
    const result = await compileUtilities(
      [
        'dark:text-white',
        'print:hidden',
        'data-[state=open]:bg-red-500',
        'aria-disabled:opacity-50',
        'aria-[sort=ascending]:opacity-50',
        'supports-[display:grid]:grid',
      ],
      (candidate) => `x-${candidate.replaceAll(/[^a-z0-9]/gi, '-')}`,
    );

    expect(result.css).toContain('@media (prefers-color-scheme: dark)');
    expect(result.css).toContain('@media print');
    expect(result.css).toContain('[data-state=open]');
    expect(result.css).toContain('[aria-disabled="true"]');
    expect(result.css).toContain('[aria-sort=ascending]');
    expect(result.css).toContain('@supports (display: grid)');
    expect(result.css).not.toContain('.data-\\[state');
  });

  it('compiles group, peer, has, and not structural variants with their native selector relationships', async () => {
    const result = await compileUtilities(
      [
        'group-hover:bg-red-500',
        'peer-checked:text-white',
        'has-[input:checked]:border-blue-600',
        'not-hover:opacity-50',
      ],
      (candidate) => `x-${candidate.replaceAll(/[^a-z0-9]/gi, '-')}`,
    );

    expect(result.css).toContain('.group:hover .x-group-hover-bg-red-500');
    expect(result.css).toContain('.peer:checked ~ .x-peer-checked-text-white');
    expect(result.css).toContain('.x-has--input-checked--border-blue-600:has(input:checked)');
    expect(result.css).toContain('.x-not-hover-opacity-50:not(*:hover)');
  });

  it('compiles direct, group, and peer custom-element state variants', async () => {
    const result = await compileUtilities(
      ['state-[open]:shadow-xl', 'group-state-[open]:text-white', 'peer-state-[selected]:opacity-100'],
      (candidate) => `x-${candidate.replaceAll(/[^a-z0-9]/gi, '-')}`,
    );

    expect(result.css).toContain('.x-state--open--shadow-xl:state(open)');
    expect(result.css).toContain('.group:state(open) .x-group-state--open--text-white');
    expect(result.css).toContain('.peer:state(selected) ~ .x-peer-state--selected--opacity-100');
    await expect(compileUtilities(['state-[]:block'], () => 'x-invalid')).rejects.toThrow('Invalid CSSX custom state');
    await expect(compileUtilities(['state-[initial]:block'], () => 'x-invalid')).rejects.toThrow(
      'Invalid CSSX custom state',
    );
  });

  it('compiles direct structural, form-state, and pseudo-element variants', async () => {
    const result = await compileUtilities(
      [
        'checked:bg-blue-500',
        'group-checked:text-white',
        'group-first:text-white',
        'first:pt-0',
        'odd:bg-slate-50',
        'not-first:opacity-50',
        'required:border-red-500',
        'before:bg-blue-500',
        'selection:text-white',
        'file:mr-4',
        'hover:before:block',
      ],
      (candidate) => `x-${candidate.replaceAll(/[^a-z0-9]/gi, '-')}`,
    );

    expect(result.css).toContain('.x-checked-bg-blue-500:checked');
    expect(result.css).toContain('.group:checked .x-group-checked-text-white');
    expect(result.css).toContain('.group:first-child .x-group-first-text-white');
    expect(result.css).toContain('.x-first-pt-0:first-child');
    expect(result.css).toContain('.x-odd-bg-slate-50:nth-child(odd)');
    expect(result.css).toContain('.x-not-first-opacity-50:not(*:first-child)');
    expect(result.css).toContain('.x-required-border-red-500:required');
    expect(result.css).toContain(
      '.x-before-bg-blue-500::before{content:var(--cssx-content, "");background-color:#3b82f6;}',
    );
    expect(result.css).toContain('.x-selection-text-white::selection{color:#fff;}');
    expect(result.css).toContain('.x-file-mr-4::file-selector-button{margin-right:calc(0.25rem * 4);}');
    expect(result.css).toContain('.x-hover-before-block:hover::before{content:var(--cssx-content, "");display:block;}');
  });

  it('compiles descendant, relational, presence, negated-feature, and arbitrary responsive variants', async () => {
    const result = await compileUtilities(
      [
        '*:p-2',
        '**:text-white',
        'has-checked:ring-2',
        'in-focus:bg-blue-500',
        'data-active:opacity-50',
        'not-supports-[display:grid]:flex',
        'max-md:hidden',
        'min-[900px]:grid',
      ],
      (candidate) => `x-${candidate.replaceAll(/[^a-z0-9]/gi, '-')}`,
    );

    expect(result.css).toContain(':is(.x---p-2 > *){padding:calc(0.25rem * 2);}');
    expect(result.css).toContain(':is(.x----text-white *){color:#fff;}');
    expect(result.css).toContain('.x-has-checked-ring-2:has(*:checked)');
    expect(result.css).toContain(':where(*:focus) .x-in-focus-bg-blue-500');
    expect(result.css).toContain('.x-data-active-opacity-50[data-active]');
    expect(result.css).toContain('@supports not (display: grid)');
    expect(result.css).toContain('@media (width < 48rem)');
    expect(result.css).toContain('@media (width >= 900px)');
  });

  it('compiles safe arbitrary selector and at-rule variants', async () => {
    const result = await compileUtilities(
      [
        '[&>svg]:block',
        '[&.is-active]:bg-orange-500',
        "[&[data-label='&']]:block",
        '[html[data-theme=dark]_&]:text-white',
        '[&[data-label=hello\\_world]]:block',
        '[@supports(display:grid)]:grid',
      ],
      (candidate) => `x-${candidate.replaceAll(/[^a-z0-9]/gi, '-')}`,
    );

    expect(result.css).toContain('.x----svg--block>svg');
    expect(result.css).toContain('.x----is-active--bg-orange-500.is-active');
    expect(result.css).toContain("[data-label='&']{display:block;}");
    expect(result.css).toContain('html[data-theme=dark] .x--html-data-theme-dark-----text-white{color:#fff;}');
    expect(result.css).toContain('[data-label=hello_world]{display:block;}');
    expect(result.css).toContain('@supports (display:grid){.x---supports-display-grid---grid{display:grid;}}');
  });

  it('supports selector-based dark mode and xs responsive utilities', async () => {
    const result = await compileUtilities(
      ['dark:text-white', 'xs:p-5', 'max-md:hidden'],
      (candidate) => `x-${candidate.replaceAll(/[^a-z0-9]/gi, '-')}`,
      '',
      {},
      undefined,
      { darkMode: 'selector' },
    );

    expect(result.css).toContain('.x-dark-text-white:where([data-theme=dark], [data-theme=dark] *){color:#fff;}');
    expect(result.css).toContain('@media (width >= 30rem)');
    expect(result.css).toContain('@media (width < 48rem)');
  });

  it('supports class-based dark mode', async () => {
    const result = await compileUtilities(
      ['dark:text-white'],
      (candidate) => `x-${candidate.replaceAll(/[^a-z0-9]/gi, '-')}`,
      '',
      {},
      undefined,
      { darkMode: 'class' },
    );

    expect(result.css).toContain('.x-dark-text-white:where(.dark, .dark *){color:#fff;}');
  });

  it('emits selector-based dark utilities after their base utilities', async () => {
    const result = await compileUtilities(
      ['bg-white', 'hover:bg-slate-100', 'dark:bg-slate-950', 'dark:hover:bg-slate-800'],
      (candidate) => `x-${candidate.replaceAll(/[^a-z0-9]/gi, '-')}`,
      '',
      {},
      undefined,
      { darkMode: 'selector' },
    );

    expect(result.css.indexOf('.x-bg-white{')).toBeLessThan(result.css.indexOf('.x-dark-bg-slate-950:where'));
    expect(result.css.indexOf('.x-hover-bg-slate-100:hover')).toBeLessThan(
      result.css.indexOf('.x-dark-hover-bg-slate-800:where'),
    );
  });

  it('rejects arbitrary selector variants without an anchor', async () => {
    await expect(compileUtilities(['[.is-active]:block'], () => 'x-test')).rejects.toThrow('must contain "&"');
  });

  it('emits only keyframes referenced by animation utilities', async () => {
    const result = await compileUtilities(['animate-spin', 'p-4'], (candidate) => `x-${candidate}`);
    expect(result.css).toContain('@keyframes spin');
    expect(result.css).not.toContain('@keyframes ping');

    const custom = await compileUtilities(
      ['animate-wiggle'],
      (candidate) => `x-${candidate}`,
      '@theme { --animate-wiggle: wiggle 1s linear infinite; @keyframes wiggle { from { opacity: 0; } to { opacity: 1; } } }',
    );
    expect(custom.css).toContain('@keyframes wiggle');
    expect(custom.css).toContain('animation:wiggle 1s linear infinite');
  });

  it('emits non-inline theme variables while retaining concrete media query values', async () => {
    const result = await compileUtilities(
      ['bg-brand', 'p-4', 'tablet:block'],
      (candidate) => `x-${candidate.replaceAll(':', '-')}`,
      '@theme reference { --color-brand: #123456; --spacing: 2px; --breakpoint-tablet: 50rem; }',
    );

    expect(result.css).toContain(':root{--color-brand:#123456;--spacing:2px}');
    expect(result.css).toContain('background-color:var(--color-brand)');
    expect(result.css).toContain('padding:calc(var(--spacing) * 4)');
    expect(result.css).toContain('@media (width >= 50rem)');
    expect(result.css).not.toContain('--breakpoint-tablet:50rem');
  });

  it('validates generated classes and includes only live atomic selectors', async () => {
    await expect(compileUtilities(['p-4'], () => '')).rejects.toThrow('unsafe generated class name');
    await expect(compileUtilities(['p-4'], () => 'unsafe/class')).rejects.toThrow('unsafe generated class name');
    await expect(compileUtilities(['p-4'], () => 'p-atom', '', {}, new Set())).resolves.toMatchObject({ entries: [] });
    await expect(compileUtilities(['size-4'], () => 'first second', '', {}, new Set(['first']))).resolves.toMatchObject(
      { entries: [{ candidate: 'size-4' }] },
    );
    await expect(compileUtilities(['size-4'], () => 'one two three')).rejects.toThrow('expected 2 generated classes');
    await expect(
      compileUtilities(
        Array.from({ length: 50_001 }, () => 'p-4'),
        () => 'x',
      ),
    ).rejects.toThrow('50,000');
  });

  it('rejects invalid responsive, at-rule, and View Transition variant compositions', () => {
    const theme = parseTheme();
    const declarations = [{ property: 'display', value: 'block' }];

    expect(() => applyVariants('.x', declarations, ['min-[]'], theme)).toThrow('Invalid CSSX responsive variant');
    expect(() => applyVariants('.x', declarations, ['max-unknown'], theme)).toThrow('does not support variant');
    expect(() => applyVariants('.x', declarations, ['unknown'], theme)).toThrow('does not support variant');
    expect(() => applyVariants('.x', declarations, ['[@supports]'], theme)).toThrow('Invalid CSSX arbitrary at-rule');
    expect(() => applyVariants('.x', declarations, ['before'], theme)).not.toThrow();
    expect(() =>
      applyVariants(
        '.x',
        [
          { property: 'display', value: 'block', selectorSuffix: '::before' },
          { property: 'color', value: 'red' },
        ],
        [],
        theme,
      ),
    ).toThrow('must share one selector scope');
    for (const variant of ['*', '**', 'after', 'peer-hover', 'has-hover', 'in-hover', '[&>svg]']) {
      expect(() => applyVariants('.x', declarations, [variant, 'vt-old-[card]'], theme)).toThrow('cannot compose');
    }
  });

  it('renders arbitrary maximum responsive variants', () => {
    const theme = parseTheme();
    expect(applyVariants('.x', [{ property: 'display', value: 'block' }], ['max-[600px]'], theme)).toBe(
      '@media (width < 600px){.x{display:block;}}',
    );
  });
});
