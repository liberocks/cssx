import { expect, it } from 'vitest';

import { findSxCalls } from './find-sx-calls';

it('returns complete calls with balanced nested expressions and quoted delimiters', () => {
  const source = 'const first = sx("p-4"); const second = sx(make(" ) ", nested(1)));';
  const firstStart = source.indexOf('sx');
  const secondStart = source.indexOf('sx', firstStart + 2);
  expect(findSxCalls(source)).toEqual([
    { start: firstStart, end: source.indexOf(';'), code: 'sx("p-4")' },
    { start: secondStart, end: source.length - 1, code: 'sx(make(" ) ", nested(1)))' },
  ]);
});

it('skips escaped quoted delimiters, finds opaque source calls, and ignores incomplete calls', () => {
  const escapedSource = 'sx("a\\\"b)")';
  expect(findSxCalls(escapedSource)).toEqual([{ start: 0, end: escapedSource.length, code: escapedSource }]);
  expect(findSxCalls('sx("unfinished)')).toEqual([]);
  const opaqueSource = 'const text = "not sx(p-4)";';
  expect(findSxCalls(opaqueSource)).toEqual([
    { start: opaqueSource.indexOf('sx'), end: opaqueSource.indexOf(')') + 1, code: 'sx(p-4)' },
  ]);
});
