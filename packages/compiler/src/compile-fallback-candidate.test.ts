import { expect, it } from 'vitest';

import { parseCandidate } from './candidate';
import { compileFallbackCandidate } from './compile-fallback-candidate';
import { getUtilityAtoms } from './get-utility-atoms';
import { parseTheme } from './theme';

const theme = parseTheme();

it('replaces the source fallback selector with the generated selector', () => {
  const result = compileFallbackCandidate({
    candidateSource: 'align-baseline',
    classNames: ['x'],
    theme,
    atoms: getUtilityAtoms('align-baseline', theme),
    candidate: parseCandidate('align-baseline'),
    semanticGroup: 'fallback-vertical-align',
    fallbackCss: '.align-baseline{vertical-align: baseline;}',
    selectorAliases: {},
    includedClasses: undefined,
    variantOptions: {},
  });

  expect(result).toEqual([
    {
      candidate: 'align-baseline',
      className: 'x',
      css: '.x{vertical-align: baseline;}',
      order: expect.stringContaining('fallback-vertical-align') as unknown as string,
    },
  ]);
});

it('requires one generated class and emits empty CSS when all aliases are excluded', () => {
  const options = {
    candidateSource: 'align-baseline',
    classNames: ['x'],
    theme,
    atoms: getUtilityAtoms('align-baseline', theme),
    candidate: parseCandidate('align-baseline'),
    semanticGroup: 'fallback-vertical-align',
    fallbackCss: '.align-baseline{vertical-align: baseline;}',
    selectorAliases: { x: [] },
    includedClasses: new Set(['other']),
    variantOptions: {},
  };
  expect(compileFallbackCandidate(options)[0]?.css).toBe('');
  expect(() => compileFallbackCandidate({ ...options, classNames: ['x', 'y'] })).toThrow(
    'expected one generated class for fallback utility "align-baseline"',
  );
});
