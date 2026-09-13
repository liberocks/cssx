import { expect, it } from 'vitest';
import { transformedExpression } from './transformed-expression';

it('extracts the generated expression from the synthetic module body', () => {
  expect(transformedExpression('import { sx } from "@cssxio/cssx";\nconst style = sx("p-4");')).toBe('sx("p-4")');
});
