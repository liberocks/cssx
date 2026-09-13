import { expect, it } from 'vitest';

import { atomSemantics } from './atom-semantics';
import type { UtilityConflictRecord } from './utility-conflict-record';

const fallback: UtilityConflictRecord = { scope: 'base', group: 'g', conflicts: ['g'] };

it('uses explicit semanticGroup and semanticConflicts when present', () => {
  expect(
    atomSemantics(
      [{ property: 'any', semanticGroup: 'font-stack', semanticConflicts: ['font-family', 'font-size'] }],
      fallback,
    ),
  ).toEqual({ scope: 'base', group: 'font-stack', conflicts: ['font-family', 'font-size'] });
});

it('falls back to an array containing the semanticGroup when semanticConflicts is absent', () => {
  expect(atomSemantics([{ property: 'any', semanticGroup: 'my-group' }], fallback)).toEqual({
    scope: 'base',
    group: 'my-group',
    conflicts: ['my-group'],
  });
});

it('matches a known ATOM_SEMANTIC_SLOTS property', () => {
  expect(atomSemantics([{ property: 'padding' }], fallback)).toEqual({
    scope: 'base',
    group: 'p',
    conflicts: ['p', 'px', 'py', 'pt', 'pr', 'pb', 'pl'],
  });
  expect(atomSemantics([{ property: 'padding-left' }], fallback)).toEqual({
    scope: 'base',
    group: 'pl',
    conflicts: ['pl'],
  });
});

it('matches a SHORTHAND_SEMANTIC_SLOTS shorthand and longhand property', () => {
  expect(atomSemantics([{ property: 'font' }], fallback)).toEqual({
    scope: 'base',
    group: 'font',
    conflicts: expect.arrayContaining(['font']),
  });
  expect(atomSemantics([{ property: 'font-family' }], fallback)).toEqual({
    scope: 'base',
    group: 'font-family',
    conflicts: ['font-family'],
  });
});

it('falls through to a property-based record when no slot is found', () => {
  expect(atomSemantics([{ property: 'color' }], fallback)).toEqual({
    scope: 'base',
    group: 'color',
    conflicts: ['color'],
  });
});
