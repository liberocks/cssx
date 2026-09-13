import { expect, it } from 'vitest';

import { mergeTransformResults } from './merge-transform-results';

it('merges source metadata in order and keeps atomic class names unique', () => {
  const result = mergeTransformResults('combined source', [
    {
      code: 'first',
      rules: [{ className: 'first', css: '.first{}' }],
      candidates: { shared: 'first', first: 'first' },
      composites: { shared: ['first'] },
      atomicClasses: ['first', 'shared'],
      origins: { shared: { line: 1, column: 2 } },
      cssOnlySignature: 'first',
    },
    {
      code: 'second',
      rules: [{ className: 'second', css: '.second{}' }],
      candidates: { shared: 'second', second: 'second' },
      composites: { shared: ['second'] },
      atomicClasses: ['shared', 'second'],
      origins: { shared: { line: 3, column: 4 } },
      cssOnlySignature: 'second',
    },
  ]);

  expect(result).toEqual({
    code: 'combined source',
    rules: [
      { className: 'first', css: '.first{}' },
      { className: 'second', css: '.second{}' },
    ],
    candidates: { shared: 'second', first: 'first', second: 'second' },
    composites: { shared: ['second'] },
    atomicClasses: ['first', 'shared', 'second'],
    origins: { shared: { line: 3, column: 4 } },
    cssOnlySignature: 'combined source',
  });
});

it('returns empty metadata when there are no transformed blocks', () => {
  expect(mergeTransformResults('unchanged source', [])).toEqual({
    code: 'unchanged source',
    rules: [],
    candidates: {},
    composites: {},
    atomicClasses: [],
    origins: {},
    cssOnlySignature: 'unchanged source',
  });
});
