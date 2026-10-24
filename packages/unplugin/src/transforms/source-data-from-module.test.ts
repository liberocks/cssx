import { expect, it } from 'vitest';

import { sourceDataFromModule } from './source-data-from-module';

it('normalizes metadata from native modules and ignores absent or primitive values', () => {
  expect(sourceDataFromModule({}, 'cssx')).toBeUndefined();
  expect(sourceDataFromModule({ buildInfo: { cssx: null } }, 'cssx')).toBeUndefined();
  expect(
    sourceDataFromModule(
      { buildInfo: { cssx: { id: 1, candidates: 2, composites: null, atomicClasses: 'bad', origins: false } } },
      'cssx',
    ),
  ).toEqual({ id: '', candidates: {}, composites: {}, origins: {} });
  expect(
    sourceDataFromModule(
      {
        buildInfo: {
          cssx: {
            id: '/app.ts',
            candidates: { 'p-4': 'padding' },
            composites: { composite: ['padding'] },
            atomicClasses: ['padding'],
            origins: { 'p-4': { line: 1, column: 2 } },
          },
        },
      },
      'cssx',
    ),
  ).toEqual({
    id: '/app.ts',
    candidates: { 'p-4': 'padding' },
    composites: { composite: ['padding'] },
    atomicClasses: ['padding'],
    origins: { 'p-4': { line: 1, column: 2 } },
  });
});
