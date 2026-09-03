import { describe, expect, it } from 'vitest';
import {
  classifyUtility,
  compileStyleRecords,
  composeCompiledStyles,
  createClassNameAllocator,
  mergeCompiledStyles,
} from '../src/index';

describe('CSSX semantic conflict classifier', () => {
  it('preserves directional shorthand conflicts and canonical scopes', () => {
    expect(classifyUtility('p-4')).toMatchObject({ group: 'p', conflicts: expect.arrayContaining(['px', 'pr']) });
    expect(classifyUtility('pr-4')).toMatchObject({ group: 'pr', conflicts: ['pr'] });
    expect(classifyUtility('focus:hover:p-4')).toMatchObject({ scope: 'focus:hover', group: 'p' });
    expect(classifyUtility('hover:focus:p-4')).toMatchObject({ scope: 'focus:hover', group: 'p' });
  });

  it('classifies arbitrary properties without treating them as opaque browser strings', () => {
    expect(classifyUtility('[paint-order:markers]')).toMatchObject({ group: 'arbitrary..paint-order' });
    expect(classifyUtility('border-red-500/50')).toMatchObject({ group: 'border-color' });
  });

  it('emits complete source-utility records for dynamic composition', () => {
    const result = compileStyleRecords({ base: 'p-4', refined: 'px-2 pr-1' });
    const base = result.styles.base;
    const refined = result.styles.refined;
    if (!base || !refined) {
      throw new Error('Expected compiled compiled styles.');
    }

    expect(base._[0]).toEqual(expect.arrayContaining([null, '', 'p']));
    expect(base._[1]?.[2]).toBe('p');
    const pxLeftClass = refined._[0]?.[0];
    expect(pxLeftClass).toBeDefined();
    expect(mergeCompiledStyles([base, refined])).toBe(
      [result.classes['p-4'], pxLeftClass, result.classes['pr-1']].join(' '),
    );
  });

  it('uses null-class tombstones to clear every semantic domain of reset utilities', () => {
    const result = compileStyleRecords({ numeric: 'slashed-zero tabular-nums', reset: 'normal-nums' });
    const numeric = result.styles.numeric;
    const reset = result.styles.reset;
    if (!numeric || !reset) {
      throw new Error('Expected numeric styles.');
    }

    expect(reset._[0]).toEqual(expect.arrayContaining([null, '', 'numeric-normal']));
    expect(reset._[1]?.[0]).toBe(result.classes['normal-nums']);
    expect(mergeCompiledStyles([numeric, reset])).toBe(result.classes['normal-nums']);
  });

  it('uses canonical candidate and theme identity for deterministic random generated class names', () => {
    const className = { variant: 'random' as const, prefix: 'x', suffix: '' };
    const first = compileStyleRecords({ root: 'bg-red-500 p-4' }, { className });
    const reordered = compileStyleRecords({ root: 'p-4 bg-red-500' }, { className });
    const themed = compileStyleRecords({ root: 'p-4' }, { theme: '@theme { --spacing: 2px; }', className });
    const defaults = compileStyleRecords({ root: 'p-4' }, { className });

    expect(first.classes['p-4']).toBe(reordered.classes['p-4']);
    expect(first.classes['bg-red-500']).toBe(reordered.classes['bg-red-500']);
    expect(themed.classes['p-4']).not.toBe(defaults.classes['p-4']);
  });

  it('rejects candidates that have composition metadata but no generated CSS', () => {
    expect(() => compileStyleRecords({ root: 'bg-not-a-token' })).toThrow('cannot compile utility');
  });

  it('keeps independently writable border width and color records during dynamic composition', () => {
    const result = compileStyleRecords({ width: 'border', color: 'border-red-500' });
    const width = result.styles.width;
    const color = result.styles.color;
    if (!width || !color) {
      throw new Error('Expected compiled border styles.');
    }

    expect(width._[0]?.[2]).toBe('border-width');
    expect(color._[0]?.[2]).toBe('border-color');
    expect(mergeCompiledStyles([width, color])).toBe(`${result.classes.border} ${result.classes['border-red-500']}`);
  });

  it('partially overrides multi-side border-width utilities atom by atom', () => {
    const result = compileStyleRecords({ horizontal: 'border-x', right: 'border-r-4' });
    const horizontal = result.styles.horizontal;
    const right = result.styles.right;
    if (!horizontal || !right) {
      throw new Error('Expected compiled border styles.');
    }

    expect(mergeCompiledStyles([horizontal, right]).split(' ')).toHaveLength(2);
  });

  it('keeps space reversal while replacing only the competing spacing value', () => {
    const result = compileStyleRecords({ wide: 'space-x-4', narrow: 'space-x-2', reverse: 'space-x-reverse' });
    const wide = result.styles.wide;
    const narrow = result.styles.narrow;
    const reverse = result.styles.reverse;
    if (!wide || !narrow || !reverse) {
      throw new Error('Expected compiled compiled styles.');
    }

    expect(mergeCompiledStyles([wide, reverse])).toBe(
      `${result.classes['space-x-4']} ${result.classes['space-x-reverse']}`,
    );
    expect(mergeCompiledStyles([wide, narrow, reverse])).toBe(
      `${result.classes['space-x-2']} ${result.classes['space-x-reverse']}`,
    );
  });

  it('keeps divider color and reversal while replacing only the competing divider width', () => {
    const result = compileStyleRecords({
      wide: 'divide-x-4',
      narrow: 'divide-x-2',
      reverse: 'divide-x-reverse',
      color: 'divide-red-500',
    });
    const wide = result.styles.wide;
    const narrow = result.styles.narrow;
    const reverse = result.styles.reverse;
    const color = result.styles.color;
    if (!wide || !narrow || !reverse || !color) {
      throw new Error('Expected compiled compiled styles.');
    }

    expect(mergeCompiledStyles([wide, narrow, reverse, color])).toBe(
      `${result.classes['divide-x-2']} ${result.classes['divide-x-reverse']} ${result.classes['divide-red-500']}`,
    );
  });

  it('treats placeholder colors as a pseudo-element write group', () => {
    const result = compileStyleRecords({ muted: 'placeholder-slate-500', alert: 'placeholder-red-500' });
    const muted = result.styles.muted;
    const alert = result.styles.alert;
    if (!muted || !alert) {
      throw new Error('Expected compiled compiled styles.');
    }

    expect(mergeCompiledStyles([muted, alert])).toBe(result.classes['placeholder-red-500']);
  });

  it('replaces outline width while preserving independently writable style, offset, and color', () => {
    const result = compileStyleRecords({
      wide: 'outline-4',
      narrow: 'outline-2',
      dashed: 'outline-dashed',
      offset: 'outline-offset-2',
      color: 'outline-blue-500',
    });
    const wide = result.styles.wide;
    const narrow = result.styles.narrow;
    const dashed = result.styles.dashed;
    const offset = result.styles.offset;
    const color = result.styles.color;
    if (!wide || !narrow || !dashed || !offset || !color) {
      throw new Error('Expected compiled compiled styles.');
    }

    expect(mergeCompiledStyles([wide, narrow, dashed, offset, color])).toBe(
      `${result.classes['outline-2']} ${result.classes['outline-dashed']} ${result.classes['outline-offset-2']} ${result.classes['outline-blue-500']}`,
    );
  });

  it('keeps logical and physical spacing writes independent across writing modes', () => {
    const result = compileStyleRecords({ physical: 'pl-4', logical: 'ps-2' });
    const physical = result.styles.physical;
    const logical = result.styles.logical;
    if (!physical || !logical) {
      throw new Error('Expected compiled compiled styles.');
    }

    expect(mergeCompiledStyles([physical, logical])).toBe(`${result.classes['pl-4']} ${result.classes['ps-2']}`);
  });

  it('partially overrides the width channel of size utilities', () => {
    const result = compileStyleRecords({ square: 'size-4', wide: 'w-8' });
    const square = result.styles.square;
    const wide = result.styles.wide;
    if (!square || !wide) {
      throw new Error('Expected compiled compiled styles.');
    }

    expect(mergeCompiledStyles([square, wide]).split(' ')).toHaveLength(2);
  });

  it('replaces gradient stops by channel while preserving direction and other stops', () => {
    const result = compileStyleRecords({
      direction: 'bg-linear-to-r',
      cool: 'from-blue-500 via-cyan-500',
      warm: 'from-red-500 to-transparent',
    });
    const direction = result.styles.direction;
    const cool = result.styles.cool;
    const warm = result.styles.warm;
    if (!direction || !cool || !warm) {
      throw new Error('Expected compiled gradient styles.');
    }

    expect(mergeCompiledStyles([direction, cool, warm])).toBe(
      `${result.classes['bg-linear-to-r']} ${result.classes['via-cyan-500']} ${result.classes['from-red-500']} ${result.classes['to-transparent']}`,
    );
  });

  it('enforces compiler input and class-name limits before generating records', () => {
    expect(() =>
      compileStyleRecords(Object.fromEntries(Array.from({ length: 10_001 }, (_, index) => [`s${index}`, 'p-4']))),
    ).toThrow('at most 10000 entries');

    const source = `${'p-4 '.repeat(4_095)}p-4`;
    expect(() =>
      compileStyleRecords(Object.fromEntries(Array.from({ length: 13 }, (_, index) => [`s${index}`, source]))),
    ).toThrow('at most 50000 utility candidates');
  });

  it('validates every class-name option and probes reserved random names', () => {
    expect(() => createClassNameAllocator({ variant: 'other' as never })).toThrow('variant');
    expect(() => createClassNameAllocator({ prefix: '' })).not.toThrow();
    expect(() => createClassNameAllocator({ suffix: '.' })).toThrow('suffix');
    expect(() => createClassNameAllocator({ variant: 'random', length: 0 })).toThrow('length');

    const className = { variant: 'random' as const, prefix: 'x', suffix: '' };
    const first = compileStyleRecords({ style: 'p-4' }, { className });
    const allocator = createClassNameAllocator(className);
    allocator.reserve([first.classes['p-4']!]);
    const retried = compileStyleRecords({ style: 'p-4' }, { classNameAllocator: allocator });

    expect(retried.classes['p-4']).not.toBe(first.classes['p-4']);
  });

  it('handles empty and malformed external compiled records safely', () => {
    expect(composeCompiledStyles([])).toEqual({ className: '', atomicClasses: [] });
    expect(mergeCompiledStyles([{ $$css: 2, c: '', _: [undefined, ['', '', 'group', undefined]] as never }])).toBe('');
  });

  it('plans tied reusable groups at constrained budgets and permits empty styles', () => {
    const result = compileStyleRecords(
      {
        first: 'flex items-center justify-center',
        second: 'flex items-center justify-center',
        third: 'relative block overflow-hidden',
        fourth: 'relative block overflow-hidden',
        empty: '',
      },
      { reusabilityBudget: 1 },
    );

    expect(result.classNames.empty).toBe('');
    expect(Object.values(result.composites)).toHaveLength(2);
  });

  it('keeps an empty style unaliased at a zero reusability budget', () => {
    expect(compileStyleRecords({ empty: '' }, { reusabilityBudget: 0 }).classNames.empty).toBe('');
  });

  it('selects complete reusable groups and resolves tie-breaks deterministically', () => {
    const complete = compileStyleRecords({
      first: 'flex items-center justify-center',
      second: 'flex items-center justify-center',
    });
    expect(complete.classNames.first).toBe(complete.classNames.second);

    const constrained = compileStyleRecords(
      {
        first: 'p-4 bg-red-500',
        second: 'p-4 bg-red-500',
        third: 'p-4 bg-red-500',
        fourth: 'm-4 text-white',
        fifth: 'm-4 text-white',
        sixth: 'm-4 text-white',
      },
      { reusabilityBudget: 50 },
    );
    expect(Object.values(constrained.composites)).toHaveLength(2);
  });

  it('includes non-inline themes and reset tokens in random class identities', () => {
    const className = { variant: 'random' as const };
    const reference = compileStyleRecords(
      { style: 'p-4' },
      { className, theme: '@theme reference { --spacing: 2px; }' },
    );
    const reset = compileStyleRecords({ style: 'p-4' }, { className, theme: '@theme { --unused: initial; }' });

    expect(reference.classes['p-4']).not.toBe(reset.classes['p-4']);
  });
});
