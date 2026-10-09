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

it('reports source naming, absent origins, empty composites, and orphaned atomic classes', () => {
  const report = createCssxDebugReport(
    [
      {
        id: 'src/empty.tsx',
        candidates: { 'p-4': 's1x' },
        composites: { s2x: [], s3x: ['unmatched'] },
        atomicClasses: ['orphan'],
      },
    ],
    '.s1x{padding:1rem}',
    { stableClassNames: true },
  );

  expect(report.naming).toEqual({
    mode: 'source',
    reason: 'stableClassNames compatibility option selects source-addressed composites',
  });
  expect(report.serverClientMappings).toEqual({ status: 'consistent-in-process', conflicts: [] });
  expect(report.coordination).toEqual({ mode: 'memory' });
  expect(report.classes).toContainEqual({
    className: 's3x',
    module: 'src/empty.tsx',
    utilities: [],
    line: 1,
    column: 1,
    selectorFound: false,
  });
  expect(report.classes.find((entry) => entry.className === 'orphan')).toMatchObject({
    utilities: [],
    selectorFound: false,
  });
});

it('explains explicit and default serial naming and composite locations without origins', () => {
  const module: CssxSourceModule = {
    id: 'src/no-origins.tsx',
    candidates: { 'p-4': 's1x' },
    composites: { s2x: ['s1x'] },
    atomicClasses: ['s1x', 's2x'],
  };
  const explicit = createCssxDebugReport([module], '.s2x{padding:1rem}', { naming: 'serial' });
  const fallback = createCssxDebugReport([module], '.s2x{padding:1rem}', {});

  expect(explicit.naming).toEqual({ mode: 'serial', reason: 'explicit naming option' });
  expect(fallback.naming).toEqual({ mode: 'serial', reason: 'default serial naming' });
  expect(explicit.classes.find((entry) => entry.className === 's2x')).toMatchObject({ line: 1, column: 1 });
});

it('defaults missing atomic class lists to an empty list', () => {
  const report = createCssxDebugReport(
    [{ id: 'src/card.tsx', candidates: { 'p-4': 's0x' } }],
    '.s0x{padding:1rem}',
    {},
  );

  expect(report.classes).toEqual([
    {
      className: 's0x',
      module: 'src/card.tsx',
      utilities: ['p-4'],
      line: 1,
      column: 1,
      selectorFound: true,
    },
  ]);
});

it('preserves the first module and merges utilities when atomic and composite names overlap', () => {
  const report = createCssxDebugReport(
    [
      {
        id: 'src/first.tsx',
        candidates: { 'p-4': 's1x' },
        atomicClasses: ['s1x'],
        origins: { 'p-4': { line: 2, column: 3 } },
      },
      {
        id: 'src/second.tsx',
        candidates: { 'text-white': 's2x' },
        composites: { s1x: ['s2x'] },
        atomicClasses: ['s1x', 's2x'],
        origins: { 'text-white': { line: 7, column: 5 } },
      },
    ],
    '.s1x{padding:1rem;color:white}',
    {},
  );

  expect(report.classes.find((entry) => entry.className === 's1x')).toEqual({
    className: 's1x',
    module: 'src/first.tsx',
    utilities: ['p-4', 'text-white'],
    line: 3,
    column: 4,
    selectorFound: true,
  });
});
