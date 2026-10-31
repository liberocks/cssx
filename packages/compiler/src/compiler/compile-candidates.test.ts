import { expect, it } from 'vitest';

import { parseTheme } from '../theme/theme';
import { compileCandidates } from './compile-candidates';

const theme = parseTheme();

it('resolves each distinct candidate once', () => {
  const compiled = compileCandidates(['p-4', 'bg-red-500', 'p-4'], theme);

  expect(compiled.size).toBe(2);
  expect(compiled.get('p-4')).toBeDefined();
  expect(compiled.get('bg-red-500')).toBeDefined();
});

it('exposes classification, atoms, and per-atom semantics', () => {
  const compiled = compileCandidates(['pr-1'], theme);
  const record = compiled.get('pr-1')!;

  expect(record.classification.group).toBe('pr');
  expect(record.atoms.length).toBeGreaterThan(0);
  expect(record.atomSemantics).toHaveLength(record.atoms.length);
});

it('resolves structural markers without creating declaration atoms', () => {
  const compiled = compileCandidates(['group'], theme).get('group')!;

  expect(compiled.classification.group).toBe('structural-group');
  expect(compiled.atoms).toEqual([]);
  expect(compiled.atomSemantics).toEqual([]);
});

it('resolves custom group markers as independent structural classes', () => {
  const compiled = compileCandidates(['group-field-group', 'group-field-label'], theme);

  expect(compiled.get('group-field-group')).toMatchObject({
    classification: { group: 'structural-group:group-field-group' },
    atoms: [],
  });
  expect(compiled.get('group-field-label')?.classification.group).toBe('structural-group:group-field-label');
});

it('rejects candidates that cannot be classified', () => {
  expect(() => compileCandidates(['not-a-cssx-utility'], theme)).toThrow('CSSX cannot classify utility');
});
