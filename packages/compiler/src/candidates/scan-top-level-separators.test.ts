import { expect, it } from 'vitest';

import { scanTopLevelSeparators } from './scan-top-level-separators';

it('finds requested separators only outside nested and quoted syntax', () => {
  const source = 'hover:bg-[url("a:b c")]:focus';

  expect(scanTopLevelSeparators(source, { kind: 'character', value: ':' })).toEqual({
    separators: [
      { index: 5, length: 1 },
      { index: 23, length: 1 },
    ],
    valid: true,
  });
});

it('finds top-level whitespace while preserving escaped and nested whitespace', () => {
  const source = 'before:a\\ b bg-[rgb(1 2 3)] content-["two words"] after';

  expect(scanTopLevelSeparators(source, { kind: 'whitespace' })).toEqual({
    separators: [
      { index: 11, length: 1 },
      { index: 27, length: 1 },
      { index: 49, length: 1 },
    ],
    valid: true,
  });
});

it.each(['a]', 'a)', 'a[', 'a(', 'a\\', 'a["broken]'])('marks unbalanced syntax invalid: %s', (source) => {
  expect(scanTopLevelSeparators(source, { kind: 'character', value: ':' }).valid).toBe(false);
});

it('rejects nesting deeper than the compiler limit', () => {
  const source = `${'['.repeat(65)}x${']'.repeat(65)}`;

  expect(scanTopLevelSeparators(source, { kind: 'whitespace' }).valid).toBe(false);
});
