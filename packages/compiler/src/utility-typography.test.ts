import { describe, expect, it } from 'vitest';

import { parseTheme } from './theme';
import { compileFontSizeUtility } from './utility-typography';

describe('compileFontSizeUtility', () => {
  it('resolves custom font-size tokens and their associated typography tokens', () => {
    const theme = parseTheme(`@theme {
      --text-custom: 1.25rem;
      --text-custom--line-height: 1.5rem;
      --text-custom--letter-spacing: -.025em;
      --text-custom--font-weight: 700;
    }`);

    expect(compileFontSizeUtility('text-custom', theme)).toEqual([
      { property: 'font-size', value: '1.25rem' },
      { property: 'line-height', value: '1.5rem' },
      { property: 'letter-spacing', value: '-.025em' },
      { property: 'font-weight', value: '700' },
    ]);
  });

  it('allows a line-height modifier to override the paired theme token', () => {
    const theme = parseTheme(
      '@theme { --text-custom: 1.25rem; --text-custom--line-height: 1.5rem; --leading-tight: 1.2; }',
    );

    expect(compileFontSizeUtility('text-custom/tight', theme)).toEqual([
      { property: 'font-size', value: '1.25rem' },
      { property: 'line-height', value: '1.2' },
    ]);
  });

  it('omits missing optional typography tokens and rejects unknown font-size forms', () => {
    const theme = parseTheme('@theme { --text-custom: 1.25rem; }');

    expect(compileFontSizeUtility('text-custom', theme)).toEqual([{ property: 'font-size', value: '1.25rem' }]);
    expect(compileFontSizeUtility('text-custom/missing', theme)).toEqual([{ property: 'font-size', value: '1.25rem' }]);
    expect(compileFontSizeUtility('text-unknown', theme)).toBeNull();
    expect(compileFontSizeUtility('text-[length:1.25rem]', theme)).toBeNull();
  });
});
