import { describe, expect, it } from 'vitest';
import { classifyUtility, compileStyleRecords, mergeCompiledStyles } from '../src/index';

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
