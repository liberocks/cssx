import { expect, it } from 'vitest';

import type { ClassNameAllocator } from './class-name';
import type { CompiledCandidate } from './compile-candidates';
import { createAtomIdentities } from './create-atom-identities';
import { hashClassNameIdentity } from './hash-class-name-identity';
import { parseTheme } from './theme';
import type { UtilityConflictRecord } from './utility-conflict-record';
import type { UtilityDeclaration } from './utility-types';

const classification: UtilityConflictRecord = { scope: 'base', group: 'g', conflicts: ['g'] };
const allocator: ClassNameAllocator = { allocate: () => new Map(), reserve: () => undefined };

it('creates deterministic symbolic identities and reuses shared payload symbols', () => {
  const shared: UtilityDeclaration = { property: 'color', value: 'red' };
  const decorated: UtilityDeclaration = {
    property: 'content',
    value: '""',
    selectorSuffix: '::before',
    atRule: '@media (min-width: 640px)',
  };
  const compiled = new Map<string, CompiledCandidate>([
    ['a', { classification, atoms: [[shared]], atomSemantics: [classification] }],
    ['b', { classification, atoms: [[shared], [decorated]], atomSemantics: [classification, classification] }],
  ]);

  const result = createAtomIdentities(['b', 'a'], parseTheme(), compiled, allocator);

  const sharedIdentity = result.allocationIdentities.get(result.symbols.a![0]!)!;
  const sharedSymbol = `a${hashClassNameIdentity(sharedIdentity)}`;
  expect(result.symbols.a).toEqual([sharedSymbol]);
  expect(result.symbols.b?.[0]).toBe(sharedSymbol);
  expect(result.allocationIdentities.get(result.symbols.b![1]!)).toContain('::before');
  expect(result.allocationIdentities.get(result.symbols.b![1]!)).toContain('@media (min-width: 640px)');
});

it('uses identical atom symbols across independent allocators and encounter orders', () => {
  const declaration: UtilityDeclaration = { property: 'color', value: 'red' };
  const compiled = new Map<string, CompiledCandidate>([
    ['z', { classification, atoms: [[declaration]], atomSemantics: [classification] }],
    ['a', { classification, atoms: [[declaration]], atomSemantics: [classification] }],
  ]);
  const first = createAtomIdentities(['z', 'a'], parseTheme(), compiled, allocator);
  const second = createAtomIdentities(['a', 'z'], parseTheme(), compiled, {
    allocate: () => new Map(),
    reserve: () => undefined,
  });

  expect(second.symbols).toEqual(first.symbols);
});
