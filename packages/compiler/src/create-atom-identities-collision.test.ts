import { expect, it, vi } from 'vitest';

import type { ClassNameAllocator } from './class-name';
import type { CompiledCandidate } from './compile-candidates';
import { createAtomIdentities } from './create-atom-identities';
import { parseTheme } from './theme';
import type { UtilityConflictRecord } from './utility-conflict-record';

vi.mock('./hash-class-name-identity', () => ({ hashClassNameIdentity: () => 'same' }));

const classification: UtilityConflictRecord = { scope: 'base', group: 'g', conflicts: ['g'] };
const allocator: ClassNameAllocator = { allocate: () => new Map(), reserve: () => undefined };

it('disambiguates hash collisions between distinct atom identities', () => {
  const compiled = new Map<string, CompiledCandidate>([
    ['first', { classification, atoms: [[{ property: 'color', value: 'red' }]], atomSemantics: [classification] }],
    ['second', { classification, atoms: [[{ property: 'color', value: 'blue' }]], atomSemantics: [classification] }],
  ]);

  const result = createAtomIdentities(['first', 'second'], parseTheme(), compiled, allocator);

  expect(result.symbols.first).toEqual(['asame']);
  expect(result.symbols.second).toEqual(['asame-same']);
});
