import { expect, it } from 'vitest';

import type { ClassNameAllocator } from './class-name';
import type { CompiledCandidate } from './compile-candidates';
import { createAtomIdentities } from './create-atom-identities';
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

  expect(result.symbols.a).toEqual(['a0']);
  expect(result.symbols.b).toEqual(['a0', 'a1']);
  expect(result.allocationIdentities.get('a0')).toContain('color:red');
  expect(result.allocationIdentities.get('a1')).toContain('::before');
  expect(result.allocationIdentities.get('a1')).toContain('@media (min-width: 640px)');
});
