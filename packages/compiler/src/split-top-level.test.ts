import { expect, it } from 'vitest';

import { splitTopLevel } from './split-top-level';

it('preserves separators inside nested and quoted candidate syntax', () => {
  expect(splitTopLevel('hover:bg-[url("a:b")] :focus', ':')).toEqual(['hover', 'bg-[url("a:b")] ', 'focus']);
  expect(() => splitTopLevel('hover::block', ':')).toThrow('Invalid utility');
  expect(() => splitTopLevel('bg-[url("broken)]', ':')).toThrow('Invalid utility');
});
