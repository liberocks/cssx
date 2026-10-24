import { expect, it } from 'vitest';

import { compileExactMaskUtility } from './compile-exact-mask-utility';

it('creates declarations for fixed mask utilities', () => {
  expect(compileExactMaskUtility('mask-none')).toEqual({ property: 'mask-image', value: 'none' });
  expect(compileExactMaskUtility('mask-repeat-x')).toEqual({ property: 'mask-repeat', value: 'repeat-x' });
  expect(compileExactMaskUtility('mask-origin-content')).toEqual({ property: 'mask-origin', value: 'content-box' });
  expect(compileExactMaskUtility('mask-match')).toEqual({ property: 'mask-mode', value: 'match-source' });
});

it('returns null for utilities that require another recipe', () => {
  expect(compileExactMaskUtility('mask-position-[center]')).toBeNull();
  expect(compileExactMaskUtility('mask-x-from-20%')).toBeNull();
});
