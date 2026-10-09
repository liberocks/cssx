import { expect, it } from 'vitest';

import { createCssxDebugReport } from './create-debug-report';
import type { CssxSourceModule } from './stylesheet-types';

const modules: readonly CssxSourceModule[] = [
  {
    id: 'src/card.tsx',
    candidates: { 'p-4': 's1x', 'text-white': 's2x' },
    composites: { s3x: ['s1x', 's2x'] },
    atomicClasses: ['s1x', 's2x', 's3x'],
    origins: {
      'p-4': { line: 4, column: 9 },
      'text-white': { line: 4, column: 14 },
    },
  },
];

it('reports effective hash naming, source utilities, locations, selector coverage, and shared coordination', () => {
  const report = createCssxDebugReport(modules, '.s1x{padding:1rem}.s2x{color:white}.s3x{padding:1rem;color:white}', {
    className: { variant: 'random' },
    coordination: 'manifest',
    manifestPath: '.cssx/classes.json',
  });

  expect(report.naming).toEqual({ mode: 'hash', reason: 'className.variant option' });
  expect(report.coordination).toEqual({ mode: 'manifest', manifestPath: '.cssx/classes.json' });
  expect(report.serverClientMappings).toEqual({ status: 'manifest-shared', conflicts: [] });
  expect(report.classes).toContainEqual({
    className: 's3x',
    module: 'src/card.tsx',
    utilities: ['p-4', 'text-white'],
    line: 5,
    column: 10,
    selectorFound: true,
  });
});

it('marks missing selectors and conflicting in-process utility mappings for investigation', () => {
  const report = createCssxDebugReport(
    [modules[0]!, { ...modules[0]!, id: 'src/other.tsx', candidates: { 'p-4': 's9x' } }],
    '.s1x{padding:1rem}',
    {},
  );

  expect(report.classes.find((item) => item.className === 's3x')?.selectorFound).toBe(false);
  expect(report.serverClientMappings).toEqual({ status: 'mismatch', conflicts: ['p-4'] });
});

it('reports mapping conflicts even when compiler processes share a manifest', () => {
  const report = createCssxDebugReport(
    [modules[0]!, { ...modules[0]!, id: 'src/other.tsx', candidates: { 'p-4': 's9x' } }],
    '.s1x{padding:1rem}.s9x{padding:1rem}',
    { coordination: 'manifest', manifestPath: '.cssx/classes.json' },
  );

  expect(report.serverClientMappings).toEqual({ status: 'mismatch', conflicts: ['p-4'] });
});
