import { expect, it } from 'vitest';

import { projectStyleRecordMaps } from './project-style-record-maps';

it('projects each source map and aggregates shared composite classes', () => {
  const result = projectStyleRecordMaps({
    candidatesByMap: {
      button: { base: ['p-4'] },
      card: { base: ['p-4'] },
    },
    classes: { 'p-4': 'atomic-padding' },
    recordsByMap: {
      button: { base: [['padding', 'base', 'padding', 'padding']] },
      card: { base: [['padding', 'base', 'padding', 'padding']] },
    },
    compositionAtomsByMap: {
      button: { base: ['padding'] },
      card: { base: ['padding'] },
    },
    allocatedAtomClasses: new Map([['padding', 'atomic-padding']]),
    plannedCompositions: {
      classNames: new Map([['padding', 'padding composite-padding']]),
      fragments: new Map([['padding', [{ className: 'composite-padding', atomicClasses: ['padding'] }]]]),
    },
  });

  expect(result.styleMaps.button?.classNames.base).toBe('atomic-padding composite-padding');
  expect(result.styleMaps.card?.classNames.base).toBe('atomic-padding composite-padding');
  expect(result.composites).toEqual({ 'composite-padding': ['atomic-padding'] });
});

it('returns empty projection maps when there are no source maps', () => {
  expect(
    projectStyleRecordMaps({
      candidatesByMap: {},
      classes: {},
      recordsByMap: {},
      compositionAtomsByMap: {},
      allocatedAtomClasses: new Map(),
      plannedCompositions: { classNames: new Map(), fragments: new Map() },
    }),
  ).toEqual({ styleMaps: {}, composites: {} });
});
