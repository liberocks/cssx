import { expect, it } from 'vitest';

import { quoteVueTemplateExpression } from './quote-vue-template-expression';

it('leaves expressions unchanged outside quoted attributes', () => {
  expect(quoteVueTemplateExpression('sx("p-4")', undefined)).toBe('sx("p-4")');
});

it('rewrites JavaScript strings to avoid the containing Vue attribute delimiter', () => {
  expect(quoteVueTemplateExpression('sx("it\'s")', '"')).toBe("sx('it\\'s')");
  expect(quoteVueTemplateExpression("sx('p-4')", '"')).toBe("sx('p-4')");
  expect(quoteVueTemplateExpression('sx("a\\nb")', '"')).toBe("sx('a\\nb')");
  expect(quoteVueTemplateExpression('sx("p-4")', "'")).toBe('sx("p-4")');
});
