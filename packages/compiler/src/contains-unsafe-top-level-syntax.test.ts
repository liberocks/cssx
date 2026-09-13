import { expect, it } from 'vitest';
import { containsUnsafeTopLevelSyntax } from './contains-unsafe-top-level-syntax';

it('rejects only delimiters that escape nested candidate values', () => {
  expect(containsUnsafeTopLevelSyntax('bg-red-500;display:block')).toBe(true);
  expect(containsUnsafeTopLevelSyntax('content-[";"]')).toBe(false);
  expect(containsUnsafeTopLevelSyntax('bg-[url(data:text/plain,{})]')).toBe(false);
});
