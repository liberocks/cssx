import { expect, it } from 'vitest';
import { templateAttributeQuote } from './template-attribute-quote';

it('returns the delimiter of a Vue attribute containing the expression', () => {
  const doubleQuoted = '<Widget :class="sx(\'p-4\')" />';
  expect(templateAttributeQuote(doubleQuoted, doubleQuoted.indexOf('sx'))).toBe('"');

  const singleQuoted = '<Widget :class=\'sx("p-4")\' />';
  expect(templateAttributeQuote(singleQuoted, singleQuoted.indexOf('sx'))).toBe("'");
});

it('ignores text outside tags and returns no delimiter for unquoted expressions', () => {
  const source = "<1 invalid>{{ sx('p-4') }}</1>";
  expect(templateAttributeQuote(source, source.indexOf('sx'))).toBeUndefined();
});
