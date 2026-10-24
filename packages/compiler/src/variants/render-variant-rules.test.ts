import { expect, it } from 'vitest';

import { renderVariantRules } from './render-variant-rules';
import type { VariantRenderState } from './variant-render-state';

it('groups declaration conditions before wrapping ordered variants', () => {
  const state: VariantRenderState = {
    selectors: ['.x', '.y'],
    selectorSuffix: '::before',
    atRules: ['@media (width >= 40rem)', '@media print'],
    requiresPseudoContent: true,
  };

  expect(
    renderVariantRules(state, [
      { property: 'color', value: 'red', atRule: '@supports (color: red)' },
      { property: 'display', value: 'block' },
    ]),
  ).toBe(
    '@media (width >= 40rem){@media print{.x::before,.y::before{content:var(--cssx-content, "");display:block;}@supports (color: red){.x::before,.y::before{color:red;}}}}',
  );
});

it('renders empty declaration collections as empty output', () => {
  expect(
    renderVariantRules({ selectors: ['.x'], selectorSuffix: '', atRules: [], requiresPseudoContent: false }, []),
  ).toBe('');
});
