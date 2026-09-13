import { expect, it } from 'vitest';
import { resolveThemeTokenValue } from './resolve-theme-token-value';

it('inlines nested token references while preserving surrounding syntax', () => {
  expect(
    resolveThemeTokenValue(
      { '--color-brand': 'rgb(var(--color-base) / 50%)', '--color-base': '1 2 3' },
      'linear-gradient(var(--color-brand), transparent)',
      new Set(),
    ),
  ).toBe('linear-gradient(rgb(1 2 3 / 50%), transparent)');
});

it('rejects missing, reset, and circular token references', () => {
  expect(() => resolveThemeTokenValue({}, 'var(--missing)', new Set())).toThrow('Unknown CSSX theme token --missing');
  expect(() => resolveThemeTokenValue({ '--reset': 'initial' }, 'var(--reset)', new Set())).toThrow(
    'Unknown CSSX theme token --reset',
  );
  expect(() =>
    resolveThemeTokenValue({ '--first': 'var(--second)', '--second': 'var(--first)' }, 'var(--first)', new Set()),
  ).toThrow('Circular CSSX theme reference involving --first');
});
