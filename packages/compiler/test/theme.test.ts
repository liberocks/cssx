import { describe, expect, it } from 'vitest';
import { parseTheme, resolveThemeToken, serializeThemeKeyframe, serializeThemeTokens } from '../src/theme';

describe('CSSX theme parsing', () => {
  it('merges restricted @theme declarations over the CSSX default tokens', () => {
    const theme = parseTheme('@theme { --spacing: 2px; --color-brand: #123456; }');
    expect(resolveThemeToken(theme, '--spacing')).toBe('2px');
    expect(resolveThemeToken(theme, '--color-brand')).toBe('#123456');
    expect(resolveThemeToken(theme, '--color-red-500')).toBe('oklch(63.71% 0.237 25.331)');
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

  it('is deterministic across equivalent source-order theme definitions', () => {
    const first = parseTheme('@theme { --spacing: 1px; } @theme { --spacing: 2px; }');
    const second = parseTheme('@theme { --spacing: 1px; } @theme { --spacing: 2px; }');
    expect(first).toEqual(second);
    expect(resolveThemeToken(first, '--spacing')).toBe('2px');
  });

  it('supports explicit inline, reference, static, and prefixed theme output modes', () => {
    const inline = parseTheme('@theme inline { --color-brand: #123456; }');
    expect(resolveThemeToken(inline, '--color-brand')).toBe('#123456');
    expect(serializeThemeTokens(inline, '.x{color:#123456;}')).toBe('');

    const reference = parseTheme('@theme reference { --color-brand: var(--color-base); --color-base: #123456; }');
    expect(resolveThemeToken(reference, '--color-brand')).toBe('var(--color-brand)');
    expect(serializeThemeTokens(reference, '.x{color:var(--color-brand);}')).toBe(
      ':root{--color-base:#123456;--color-brand:var(--color-base)}',
    );

    const staticTheme = parseTheme('@theme static { --color-brand: #123456; }');
    expect(serializeThemeTokens(staticTheme, '')).toContain('--color-brand:#123456');

    const prefixed = parseTheme('@theme prefix(app) { --color-brand: #123456; }');
    expect(resolveThemeToken(prefixed, '--color-brand')).toBe('var(--app-color-brand)');
    expect(serializeThemeTokens(prefixed, '.x{color:var(--app-color-brand);}')).toBe(
      ':root{--app-color-brand:#123456}',
    );
    expect(() => parseTheme('@theme reference { --color-brand: #123456; } @theme static { --spacing: 2px; }')).toThrow(
      'conflicting output modes',
    );
  });

  it('accepts balanced values and rejects malformed comments, blocks, and keyframes', () => {
    const theme = parseTheme(
      `/* before */ @theme { --font-demo: "Example Sans"; --shadow-demo: rgb(0 0 0 / .2); @keyframes fade { from { opacity: 0; } to { opacity: 1; } } }`,
    );
    expect(resolveThemeToken(theme, '--font-demo')).toBe('"Example Sans"');
    expect(theme.keyframes.fade).toContain('@keyframes fade');

    expect(() => parseTheme('/* unfinished')).toThrow('Unterminated CSSX theme comment');
    expect(() => parseTheme('@theme { --color-brand: #123456;')).toThrow('Unterminated CSSX @theme block');
    expect(() => parseTheme('@theme prefix(123) { --color-brand: #123456; }')).toThrow('Expected "{"');
    expect(() => parseTheme('@theme { @keyframes 123 { to { opacity: 1; } } }')).toThrow(
      'Invalid CSSX @keyframes name',
    );
    expect(() => parseTheme('@theme { @keyframes fade { to opacity: 1; } }')).toThrow(
      'Invalid CSSX @keyframes selector',
    );
    expect(() => parseTheme('@theme { --color-brand: var(--color-base)); }')).toThrow(
      'Invalid CSSX @theme declaration',
    );
  });

  it('handles trailing comments, escaped values, and remaining validation edges', () => {
    const escaped = parseTheme('@theme { --font-demo: "a\\"b"; } /* trailing */');
    expect(resolveThemeToken(escaped, '--font-demo')).toBe('"a\\"b"');

    const reference = parseTheme('@theme reference { --color-brand: #123456; }');
    expect(serializeThemeTokens(reference, '')).toBe('');
    expect(serializeThemeTokens(reference, '.x{color:var(--unknown);}')).toBe('');

    expect(() => parseTheme('@theme { invalid }')).toThrow('Invalid CSSX @theme declaration');
    expect(() => parseTheme('@theme { @keyframes fade }')).toThrow('Expected "{" after @keyframes fade');
    expect(() => parseTheme('@theme { @keyframes fade { to } }')).toThrow('Unterminated CSSX @keyframes fade');
    expect(() => parseTheme('@theme { @keyframes fade { to { opacity:; } } }')).toThrow(
      'Invalid CSSX @keyframes declaration',
    );
    expect(() => parseTheme('@theme { --font-demo: "open; }')).toThrow('Unterminated CSSX @theme block');
    expect(() => parseTheme('@theme { --font-demo: calc(1px; }')).toThrow('Invalid CSSX @theme declaration');
  });

  it('serializes known keyframes and ignores empty declaration segments', () => {
    const theme = parseTheme(
      '@theme prefix(app) { ;; --color-brand: #123456;; @keyframes fade { to { color: var(--color-brand); } } }',
    );

    expect(serializeThemeKeyframe(theme, 'fade')).toContain('var(--app-color-brand)');
    expect(serializeThemeKeyframe(theme, 'missing')).toBeUndefined();
  });
});
