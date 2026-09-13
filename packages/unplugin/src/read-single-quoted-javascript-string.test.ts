import { expect, it } from 'vitest';
import { readSingleQuotedJavaScriptString } from './read-single-quoted-javascript-string';

it('decodes supported escapes while preserving unknown escapes', () => {
  expect(readSingleQuotedJavaScriptString("'it\\'s\\nready'")).toBe("it's\nready");
  expect(readSingleQuotedJavaScriptString("'a\\qb'")).toBe('a\\qb');
});
