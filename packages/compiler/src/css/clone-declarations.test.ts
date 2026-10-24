import { expect, it } from 'vitest';

import { cloneDeclarations } from './clone-declarations';

it('creates mutable declaration copies', () => {
  const source = [{ property: 'color', value: 'red' }] as const;
  const clone = cloneDeclarations(source);
  clone[0]!.value = 'blue';
  expect(source[0].value).toBe('red');
  expect(clone[0]!.value).toBe('blue');
});
