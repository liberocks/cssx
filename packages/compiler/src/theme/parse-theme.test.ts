import { describe, expect, it } from 'vitest';

import { parseTheme } from './parse-theme';

describe('parseTheme', () => {
  it('merges declarations with defaults and returns one immutable default snapshot', () => {
    const first = parseTheme();
    const second = parseTheme('');
    const custom = parseTheme('@theme { --spacing: 2px; --color-brand: #123456; }');

    expect(first).toBe(second);
    expect(Object.isFrozen(first.tokens)).toBe(true);
    expect(Object.isFrozen(first.keyframes)).toBe(true);
    expect(custom.tokens['--spacing']).toBe('2px');
    expect(custom.tokens['--color-brand']).toBe('#123456');
    expect(custom.tokens['--color-red-500']).toBe('oklch(63.71% 0.237 25.331)');
  });

  it('applies namespace and full resets in declaration order', () => {
    const namespaceReset = parseTheme('@theme { --color-*: initial; --color-brand: #123456; }');
    expect(namespaceReset.tokens['--color-red-500']).toBeUndefined();
    expect(namespaceReset.tokens['--color-brand']).toBe('#123456');
    expect(namespaceReset.tokens['--spacing']).toBe('0.25rem');

    const fullReset = parseTheme('@theme { --*: initial; --spacing: 2px; } @theme { --color-brand: var(--spacing); }');
    expect(fullReset.tokens['--color-red-500']).toBeUndefined();
    expect(fullReset.tokens['--spacing']).toBe('2px');
    expect(fullReset.tokens['--color-brand']).toBe('var(--spacing)');
    expect(() => parseTheme('@theme { --color-*: red; }')).toThrow('must use initial');
  });

  it('rejects oversized input, general stylesheet rules, and malformed declarations', () => {
    expect(() => parseTheme('body { color: red; }')).toThrow('only accepts @theme');
    expect(() => parseTheme('@theme { color: red; }')).toThrow('Invalid CSSX @theme declaration');
    expect(() => parseTheme('@theme { invalid }')).toThrow('Invalid CSSX @theme declaration');
    expect(() => parseTheme('@theme { --font-demo: calc(1px; }')).toThrow('Invalid CSSX @theme declaration');
    expect(() => parseTheme('@theme { --font-demo: "open; }')).toThrow('Unterminated CSSX @theme block');
    expect(() => parseTheme('@theme { --color-brand: #123456; }'.repeat(4_000))).toThrow('128 KiB limit');
  });

  it('parses validated keyframes, balanced values, comments, and source-order overrides', () => {
    const theme = parseTheme(
      `/* before */ @theme { --font-demo: "Example Sans"; --shadow-demo: rgb(0 0 0 / .2); @keyframes fade { from { opacity: 0; } to { opacity: 1; } } } /* trailing */`,
    );
    expect(theme.tokens['--font-demo']).toBe('"Example Sans"');
    expect(theme.keyframes.fade).toContain('@keyframes fade');

    const escaped = parseTheme('@theme { --font-demo: "a\\"b"; }');
    expect(escaped.tokens['--font-demo']).toBe('"a\\"b"');
    expect(parseTheme('@theme { --spacing: 1px; } @theme { --spacing: 2px; }').tokens['--spacing']).toBe('2px');

    expect(() => parseTheme('/* unfinished')).toThrow('Unterminated CSSX theme comment');
    expect(() => parseTheme('@theme { --color-brand: #123456;')).toThrow('Unterminated CSSX @theme block');
    expect(() => parseTheme('@theme prefix(123) { --color-brand: #123456; }')).toThrow('Expected "{"');
    expect(() => parseTheme('@theme { @keyframes 123 { to { opacity: 1; } } }')).toThrow(
      'Invalid CSSX @keyframes name',
    );
    expect(() => parseTheme('@theme { @keyframes nope { body { color: red; } } }')).toThrow(
      'Invalid CSSX @keyframes selector',
    );
    expect(() => parseTheme('@theme { @keyframes fade }')).toThrow('Expected "{" after @keyframes fade');
    expect(() => parseTheme('@theme { @keyframes fade { to } }')).toThrow('Unterminated CSSX @keyframes fade');
    expect(() => parseTheme('@theme { @keyframes fade { to { opacity:; } } }')).toThrow(
      'Invalid CSSX @keyframes declaration',
    );
    expect(() => parseTheme('@theme { --color-brand: var(--color-base)); }')).toThrow(
      'Invalid CSSX @theme declaration',
    );
  });

  it('accepts consistent output modes and rejects conflicting modifiers', () => {
    const inline = parseTheme('@theme inline { --color-brand: #123456; } @theme inline { --spacing: 2px; }');
    expect(inline.mode).toBe('inline');
    expect(parseTheme('@theme reference { --color-brand: #123456; }').mode).toBe('reference');
    expect(parseTheme('@theme static { --color-brand: #123456; }').mode).toBe('static');
    expect(parseTheme('@theme prefix(app) { --color-brand: #123456; }').prefix).toBe('app');
    expect(() => parseTheme('@theme reference { --color-brand: #123456; } @theme static { --spacing: 2px; }')).toThrow(
      'conflicting output modes',
    );
  });
});
