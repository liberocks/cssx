import { describe, expect, it } from 'vitest';

import { compileNumericUtility } from './compile-numeric-utility';

describe('compileNumericUtility', () => {
  it('composes numeric font-variant channels and normal resets', () => {
    expect(compileNumericUtility('normal-nums')?.[0]).toMatchObject({
      property: 'font-variant-numeric',
      value: 'normal',
      semanticGroup: 'numeric-normal',
    });
    expect(compileNumericUtility('tabular-nums')).toHaveLength(2);
    expect(compileNumericUtility('tabular-nums')?.[0]).toMatchObject({
      property: '--cssx-numeric-tabular-nums',
      semanticConflicts: ['numeric-tabular-nums', 'numeric-normal'],
    });
  });

  it('returns null for unknown numeric utilities', () => {
    expect(compileNumericUtility('proportional-number')).toBeNull();
  });
});
