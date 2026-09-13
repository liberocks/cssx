import { expect, it } from 'vitest';

import { normalizeClassNameOptions } from './normalize-class-name-options';

it('supplies defaults and preserves valid custom options', () => {
  expect(normalizeClassNameOptions(undefined)).toEqual({ variant: 'serial', prefix: 's', suffix: 'x' });
  expect(normalizeClassNameOptions({ variant: 'random', prefix: '', suffix: '_', length: 8 })).toEqual({
    variant: 'random',
    prefix: '',
    suffix: '_',
    length: 8,
  });
});

it('rejects unsupported variants and unsafe prefixes or suffixes', () => {
  expect(() => normalizeClassNameOptions({ variant: 'other' as never })).toThrow('className.variant');
  expect(() => normalizeClassNameOptions({ prefix: '1bad' })).toThrow('className.prefix');
  expect(() => normalizeClassNameOptions({ suffix: 'bad suffix' })).toThrow('className.suffix');
});

it('rejects invalid lengths and lengths used with serial naming', () => {
  expect(() => normalizeClassNameOptions({ variant: 'random', length: 0 })).toThrow('className.length');
  expect(() => normalizeClassNameOptions({ variant: 'serial', length: 4 })).toThrow(
    'only supported by the random naming variant',
  );
});
