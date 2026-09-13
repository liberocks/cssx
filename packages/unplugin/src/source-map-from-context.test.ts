import { expect, it } from 'vitest';
import { sourceMapFromContext } from './source-map-from-context';

it('rejects missing or incompatible build-tool source maps', () => {
  expect(sourceMapFromContext(undefined, '/project/input.ts')).toBeUndefined();
  expect(sourceMapFromContext(0, '/project/input.ts')).toBeUndefined();
  expect(sourceMapFromContext({}, '/project/input.ts')).toBeUndefined();
  expect(sourceMapFromContext({ getCombinedSourcemap: () => ({ version: 2 }) }, '/project/input.ts')).toBeUndefined();
  expect(sourceMapFromContext({ getCombinedSourcemap: () => null }, '/project/input.ts')).toBeUndefined();
  expect(sourceMapFromContext({ getCombinedSourcemap: () => 'invalid' }, '/project/input.ts')).toBeUndefined();
});

it('normalizes compatible source maps and supplies optional defaults', () => {
  const context = {
    getCombinedSourcemap: () => ({
      version: 3,
      sources: ['original.ts'],
      names: ['value'],
      mappings: 'AAAA',
      sourceRoot: '/source',
      sourcesContent: ['const value = 1;'],
    }),
  };
  expect(sourceMapFromContext(context, '/project/input.ts')).toEqual({
    version: 3,
    sources: ['original.ts'],
    names: ['value'],
    mappings: 'AAAA',
    file: '/project/input.ts',
    sourceRoot: '/source',
    sourcesContent: ['const value = 1;'],
  });

  expect(
    sourceMapFromContext(
      { getCombinedSourcemap: () => ({ version: 3, sources: [], mappings: '', sourceRoot: '', file: 'generated.js' }) },
      '/project/input.ts?query',
    ),
  ).toEqual({ version: 3, sources: [], names: [], mappings: '', file: 'generated.js' });
});
