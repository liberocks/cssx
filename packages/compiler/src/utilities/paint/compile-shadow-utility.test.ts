import { describe, expect, it } from 'vitest';

import { compileShadowUtility } from './compile-shadow-utility';

describe('compileShadowUtility', () => {
  it('compiles bracketed and custom-property shadow values into shared channels', () => {
    const declarations = compileShadowUtility('shadow-[inset_0_0_0_1px_#36c]');
    expect(declarations).toMatchObject([
      { property: '--cssx-shadow', value: 'inset 0 0 0 1px #36c', semanticGroup: 'shadow' },
      { property: 'box-shadow' },
    ]);
    expect(declarations?.[1]?.value).toContain('var(--cssx-shadow');
    expect(compileShadowUtility('shadow-(--focus-shadow)')?.[0]?.value).toBe('var(--focus-shadow)');
  });

  it('rejects unsupported shadow forms', () => {
    expect(compileShadowUtility('shadow-md')).toBeNull();
    expect(compileShadowUtility('not-shadow-[0_0_1px_black]')).toBeNull();
  });
});
