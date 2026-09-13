import { describe, expect, it } from 'vitest';
import { compileStyleRecords, compileUtilities } from '../src/index';

/**
 * Theme-derived defaults are absent from Tailwind's IntelliSense snapshot, so
 * keep them in a separate regression matrix. Add a value here whenever a
 * default `@theme` namespace introduces a generated utility family.
 */
const DEFAULT_THEME_CANDIDATES = [
  'text-xs',
  'text-sm',
  'text-base',
  'text-lg',
  'text-xl',
  'text-2xl',
  'text-3xl',
  'text-4xl',
  'text-5xl',
  'text-6xl',
  'text-7xl',
  'text-8xl',
  'text-9xl',
] as const;

describe('Tailwind 4 default theme utility matrix', () => {
  it('compiles every default text-size utility omitted by the IntelliSense snapshot', async () => {
    const records = compileStyleRecords(
      Object.fromEntries(DEFAULT_THEME_CANDIDATES.map((candidate) => [candidate, candidate])),
    );
    const result = await compileUtilities(DEFAULT_THEME_CANDIDATES, (candidate) => records.classes[candidate]!);

    expect(result.css).toContain('font-size:1.875rem');
    expect(result.css).toContain('font-size:8rem');
    expect(result.css).toContain('line-height:calc(2.25 / 1.875)');
  });
});
