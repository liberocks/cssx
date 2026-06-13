import { describe, expect, it } from 'vitest';
import { parseTheme, resolveThemeToken, serializeThemeTokens } from '../src/theme';

describe('CSSX theme parsing', () => {
  it('merges restricted @theme declarations over the CSSX default tokens', () => {
    const theme = parseTheme('@theme { --spacing: 2px; --color-brand: #123456; }');
    expect(resolveThemeToken(theme, '--spacing')).toBe('2px');
    expect(resolveThemeToken(theme, '--color-brand')).toBe('#123456');
    expect(resolveThemeToken(theme, '--color-red-500')).toBe('#ef4444');
  });

  it('includes every documented color family and its full 50–950 scale', () => {
    const theme = parseTheme();
    const families = [
      'red',
      'orange',
      'amber',
      'yellow',
      'lime',
      'green',
      'emerald',
      'teal',
      'cyan',
      'sky',
      'blue',
      'indigo',
      'violet',
      'purple',
      'fuchsia',
      'pink',
      'rose',
      'slate',
      'gray',
      'zinc',
      'neutral',
      'stone',
      'mauve',
      'olive',
      'mist',
      'taupe',
      'blue-gray',
      'brown',
      'deep-orange',
      'light-green',
      'light-blue',
      'deep-purple',
    ];
    const shades = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];

    for (const family of families) {
      for (const shade of shades) {
        expect(resolveThemeToken(theme, `--color-${family}-${shade}`)).toBeTruthy();
      }
    }
    expect(resolveThemeToken(theme, '--color-orange-500')).toBe('oklch(70.49% 0.213 47.604)');
    expect(resolveThemeToken(theme, '--color-mauve-950')).toBe('oklch(14.53% 0.008 326)');
    expect(resolveThemeToken(theme, '--color-deep-purple-950')).toBe('oklch(30.00% 0.178 274.080)');
  });

  it('reuses one immutable default design system across compiler calls', () => {
    const first = parseTheme();
    const second = parseTheme('');
    expect(first).toBe(second);
    expect(Object.isFrozen(first.tokens)).toBe(true);
    expect(Object.isFrozen(first.keyframes)).toBe(true);
  });

  it('resolves nested token references and reports unknown or circular values', () => {
    const theme = parseTheme('@theme { --color-brand: var(--color-base); --color-base: #123456; }');
    expect(resolveThemeToken(theme, '--color-brand')).toBe('#123456');
    expect(() =>
      resolveThemeToken(parseTheme('@theme { --color-a: var(--color-b); --color-b: var(--color-a); }'), '--color-a'),
    ).toThrow('Circular');
    expect(() => resolveThemeToken(parseTheme('@theme { --color-a: var(--color-missing); }'), '--color-a')).toThrow(
      'Unknown',
    );
  });

  it('applies namespace and full theme resets in source order', () => {
    const namespaceReset = parseTheme('@theme { --color-*: initial; --color-brand: #123456; }');
    expect(resolveThemeToken(namespaceReset, '--color-red-500')).toBeUndefined();
    expect(resolveThemeToken(namespaceReset, '--color-brand')).toBe('#123456');
    expect(resolveThemeToken(namespaceReset, '--spacing')).toBe('0.25rem');

    const fullReset = parseTheme('@theme { --*: initial; --spacing: 2px; } @theme { --color-brand: var(--spacing); }');
    expect(resolveThemeToken(fullReset, '--color-red-500')).toBeUndefined();
    expect(resolveThemeToken(fullReset, '--spacing')).toBe('2px');
    expect(resolveThemeToken(fullReset, '--color-brand')).toBe('2px');
    expect(() => parseTheme('@theme { --color-*: red; }')).toThrow('must use initial');
  });

  it('rejects general stylesheet constructs and malformed declaration blocks', () => {
    expect(() => parseTheme('body { color: red; }')).toThrow('only accepts @theme');
    expect(() => parseTheme('@theme { color: red; }')).toThrow('Invalid CSSX @theme declaration');
    expect(() => parseTheme('@theme { --color-brand: #123456; }'.repeat(4_000))).toThrow('128 KiB limit');
  });

  it('retains validated theme keyframes for only the utilities that request them', () => {
    const theme = parseTheme(
      '@theme { --animate-wiggle: wiggle 1s ease-in-out infinite; @keyframes wiggle { 0%, 100% { transform: rotate(-3deg); } 50% { transform: rotate(3deg); } } }',
    );
    expect(theme.keyframes.wiggle).toContain('@keyframes wiggle');
    expect(() => parseTheme('@theme { @keyframes nope { body { color: red; } } }')).toThrow(
      'Invalid CSSX @keyframes selector',
    );
  });
