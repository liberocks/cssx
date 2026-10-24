import { expect, it } from 'vitest';

import { readGeneratedClassNames } from './read-generated-class-names';

it('splits a whitespace-separated class string into validated names', () => {
  expect(readGeneratedClassNames('p-1', 'x-1 y_2 3z')).toEqual(['x-1', 'y_2', '3z']);
  expect(readGeneratedClassNames('p-1', ' single-2 ')).toEqual(['single-2']);
});

it('rejects an empty callback result', () => {
  expect(() => readGeneratedClassNames('p-1', '')).toThrow(
    'CSSX received an unsafe generated class name for utility "p-1".',
  );
  expect(() => readGeneratedClassNames('p-1', '   ')).toThrow(
    'CSSX received an unsafe generated class name for utility "p-1".',
  );
});

it('rejects class names that break the CSS identifier contract', () => {
  expect(() => readGeneratedClassNames('p-1', '-leading')).toThrow('unsafe generated class name');
  expect(() => readGeneratedClassNames('p-1', 'a!b')).toThrow('unsafe generated class name');
});
