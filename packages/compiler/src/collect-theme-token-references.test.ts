import { expect, it } from 'vitest';

import { collectThemeTokenReferences } from './collect-theme-token-references';

it('collects transitive live tokens once while skipping reset or missing values', () => {
  const theme = {
    tokens: {
      '--color-brand': 'var(--color-base) var(--color-shared)',
      '--color-base': 'var(--color-shared)',
      '--color-shared': '#123',
      '--unused': 'initial',
    },
    keyframes: {},
    mode: 'reference' as const,
    prefix: '',
  };
  const names = new Set<string>();

  collectThemeTokenReferences(theme, '--color-brand', names);
  collectThemeTokenReferences(theme, '--unused', names);
  collectThemeTokenReferences(theme, '--missing', names);

  expect([...names]).toEqual(['--color-brand', '--color-base', '--color-shared']);
});

it('terminates safely when theme token references form a cycle', () => {
  const theme = {
    tokens: { '--first': 'var(--second)', '--second': 'var(--first)' },
    keyframes: {},
    mode: 'reference' as const,
    prefix: '',
  };
  const names = new Set<string>();

  collectThemeTokenReferences(theme, '--first', names);

  expect([...names]).toEqual(['--first', '--second']);
});
