import { expect, it } from 'vitest';

import type { CompiledUtility } from './compiled-utility';
import { createCompiledStyleRecordMap } from './create-compiled-style-record-map';

it('replaces symbolic names in class strings, conflict records, and composites', () => {
  const recordsByStyle: Readonly<Record<string, readonly CompiledUtility[]>> = {
    base: [
      [null, 'base', 'padding', 'padding', 'px'],
      ['atom-padding', 'base', 'padding', 'padding'],
    ],
  };

  const result = createCompiledStyleRecordMap({
    candidates: { base: ['p-4'] },
    classes: { 'p-4': 'atomic-padding' },
    recordsByStyle,
    compositionAtomsByStyle: { base: ['atom-padding'] },
    allocatedAtomClasses: new Map([['atom-padding', 'atomic-padding']]),
    plannedCompositions: {
      classNames: new Map([['atom-padding', 'atom-padding fragment-padding']]),
      fragments: new Map([['atom-padding', [{ className: 'fragment-padding', atomicClasses: ['atom-padding'] }]]]),
    },
  });

  expect(result.styleMap).toEqual({
    styles: {
      base: {
        $$css: 2,
        c: 'atomic-padding fragment-padding',
        _: [
          [null, 'base', 'padding', 'padding', 'px'],
          ['atomic-padding', 'base', 'padding', 'padding'],
        ],
      },
    },
    classes: { 'p-4': 'atomic-padding' },
    candidates: { base: ['p-4'] },
    classNames: { base: 'atomic-padding fragment-padding' },
    composites: { 'fragment-padding': ['atomic-padding'] },
  });
  expect(result.composites).toEqual({ 'fragment-padding': ['atomic-padding'] });
});

it('uses an empty class name when a style has no planned reusable composition', () => {
  const result = createCompiledStyleRecordMap({
    candidates: { base: ['hidden'] },
    classes: { hidden: '' },
    recordsByStyle: { base: [] },
    compositionAtomsByStyle: { base: ['unallocated-atom'] },
    allocatedAtomClasses: new Map(),
    plannedCompositions: { classNames: new Map(), fragments: new Map() },
  });

  expect(result.styleMap.styles.base).toEqual({ $$css: 2, c: '', _: [] });
  expect(result.styleMap.classNames.base).toBe('');
  expect(result.composites).toEqual({});
});

it('returns empty runtime structures for a source map without styles', () => {
  const result = createCompiledStyleRecordMap({
    candidates: {},
    classes: {},
    recordsByStyle: {},
    compositionAtomsByStyle: {},
    allocatedAtomClasses: new Map(),
    plannedCompositions: { classNames: new Map(), fragments: new Map() },
  });

  expect(result.styleMap.styles).toEqual({});
  expect(result.styleMap.classNames).toEqual({});
  expect(result.composites).toEqual({});
});
