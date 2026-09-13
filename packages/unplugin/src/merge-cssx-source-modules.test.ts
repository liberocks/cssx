import { expect, it } from 'vitest';

import { mergeCssxSourceModules } from './merge-cssx-source-modules';

it('prefers current records for named IDs and retains anonymous records in source order', () => {
  const merged = mergeCssxSourceModules(
    [
      { id: '/app.ts', candidates: { 'p-4': 'current' } },
      { id: '', candidates: { 'bg-red-500': 'anonymous-current' } },
    ],
    [
      { id: '/app.ts', candidates: { 'p-4': 'stale' } },
      { id: '/server.ts', candidates: { 'text-white': 'server' } },
      { id: '', candidates: { flex: 'anonymous-server' } },
    ],
  );

  expect(merged).toEqual([
    { id: '/app.ts', candidates: { 'p-4': 'current' } },
    { id: '/server.ts', candidates: { 'text-white': 'server' } },
    { id: '', candidates: { flex: 'anonymous-server' } },
    { id: '', candidates: { 'bg-red-500': 'anonymous-current' } },
  ]);
});
