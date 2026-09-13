import { describe, expect, it } from 'vitest';

import { compileTranslateUtility } from './compile-translate-utility';
import { parseTheme } from './theme';

describe('compileTranslateUtility', () => {
  const theme = parseTheme();

  it('compiles each axis and the shared translation channel', () => {
    for (const axis of ['x', 'y', 'z']) {
      expect(compileTranslateUtility(`translate-${axis}-4`, false, theme)?.[0]).toEqual({
        property: `--cssx-translate-${axis}`,
        value: 'calc(0.25rem * 4)',
      });
    }
    expect(compileTranslateUtility('translate-4', false, theme)).toEqual([
      { property: '--cssx-translate-x', value: 'calc(0.25rem * 4)' },
      { property: '--cssx-translate-y', value: 'calc(0.25rem * 4)' },
      {
        property: 'translate',
        value: 'var(--cssx-translate-x, 0) var(--cssx-translate-y, 0) var(--cssx-translate-z, 0)',
      },
    ]);
  });

  it('applies negative values and rejects invalid or unrelated candidates', () => {
    expect(compileTranslateUtility('translate-x-1/2', true, theme)?.[0]).toEqual({
      property: '--cssx-translate-x',
      value: '-50%',
    });
    expect(compileTranslateUtility('translate-x-invalid', false, theme)).toBeNull();
    expect(compileTranslateUtility('rotate-45', false, theme)).toBeNull();
  });
});
