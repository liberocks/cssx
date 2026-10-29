import { expect, it } from 'vitest';

import { isGeneratedClassNames } from './is-generated-class-names';

it('recognizes one or more serialized CSSX class names only', () => {
  expect(isGeneratedClassNames('s0x')).toBe(true);
  expect(isGeneratedClassNames('s0x sAb9x')).toBe(true);
  expect(isGeneratedClassNames('d3h3h3vijbq5okx')).toBe(true);
  expect(isGeneratedClassNames('d3h3h3vijbq5okx s0x')).toBe(true);
  expect(isGeneratedClassNames('')).toBe(false);
  expect(isGeneratedClassNames('s0x other')).toBe(false);
  expect(isGeneratedClassNames('duration')).toBe(false);
});
