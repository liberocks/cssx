import { expect, it } from 'vitest';

import { loaderFor } from './loader-for';

it('selects TypeScript for TypeScript extensions and JavaScript otherwise', () => {
  expect(loaderFor('/src/app.ts')).toBe('ts');
  expect(loaderFor('/src/app.tsx')).toBe('ts');
  expect(loaderFor('/src/app.jsx')).toBe('js');
  expect(loaderFor('/src/app.mjs')).toBe('js');
});
