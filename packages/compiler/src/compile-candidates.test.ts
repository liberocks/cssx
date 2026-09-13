import { expect, it } from 'vitest';

import { compileCandidates } from './compile-candidates';
import { parseTheme } from './theme-parser';

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

it('rejects candidates that cannot be classified', () => {
  expect(() => compileCandidates(['not-a-cssx-utility'], theme)).toThrow('CSSX cannot classify utility');
});
