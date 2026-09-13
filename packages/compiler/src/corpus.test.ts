import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { parseCandidate } from './candidate';
import { compileStyleRecords } from './compile-style-records';
import { UTILITY_FALLBACKS } from './fallback.generated';
import { classifyParsedCandidate } from './semantics';
import { parseTheme } from './theme';
import { compileSourceUtilities, compileUtilities, resolveUtilityRecipe } from './utilities';

interface TailwindManifest {
  readonly source: {
    readonly repository: string;
    readonly major: number;
    readonly version: string;
    readonly commit: string;
    readonly snapshot: string;
  };
  readonly total: number;
  readonly candidates: readonly string[];
}

const manifest = JSON.parse(
  readFileSync(fileURLToPath(new URL('./fixtures/corpus.json', import.meta.url)), 'utf8'),
) as TailwindManifest;

describe('Tailwind 4 IntelliSense snapshot corpus', () => {
  it('accounts for every candidate from the upstream IntelliSense snapshot', () => {
    expect(manifest.source).toMatchObject({
      repository: 'https://github.com/tailwindlabs/tailwindcss',
      major: 4,
      snapshot: 'packages/tailwindcss/src/__snapshots__/intellisense.test.ts.snap#getClassList-1',
    });
    expect(manifest.source.version).toMatch(/^4\./);
    expect(manifest.source.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(manifest.source.version).toBe('4.3.3');
    expect(manifest.source.commit).toBe('c2b24dd15fed1c59dd521bd86082f520c9f5ad0d');
    expect(new Set(manifest.candidates).size).toBe(manifest.total);
  });

  it('compiles every upstream candidate', () => {
    for (const candidate of manifest.candidates) {
      expect(() => compileStyleRecords({ candidate }), candidate).not.toThrow();
    }
  }, 60_000);

  it('rebinds pinned fallback output to CSSX classes and retains true no-op candidates', async () => {
    const compiled = await compileUtilities(['align-baseline', 'inset-shadow-sm', 'border/50'], () => 'x');

    expect(compiled.css).toContain('.x{vertical-align: baseline;}');
    expect(compiled.css).toContain('.x{--cx-inset-shadow:');
    expect(compiled.classes['border/50']).toBe('');
    expect(compileStyleRecords({ noop: 'border/50' }).classNames.noop).toBe('');
  });

  it('emits the pinned utility semantics for every corpus candidate', async () => {
    const fallbackCandidates = manifest.candidates.filter(
      (candidate) => resolveUtilityRecipe(candidate, parseTheme('')).recipe.fallbackCss !== undefined,
    );
    const compiled = await compileSourceUtilities(fallbackCandidates);
    const emitted = new Map(compiled.entries.map((entry) => [entry.candidate, entry.css]));

    for (const candidate of fallbackCandidates) {
      expect(emitted.get(candidate) ?? '', candidate).toBe(UTILITY_FALLBACKS[candidate]!.css);
    }
  }, 60_000);

  it('covers recipe recovery and rejects invalid candidates without an oracle entry', async () => {
    const theme = parseTheme('');
    const recoverable = manifest.candidates.find((candidate) => {
      const parsed = parseCandidate(candidate);
      return (
        classifyParsedCandidate(parsed) !== null &&
        resolveUtilityRecipe(candidate, theme).recipe.fallbackCss !== undefined
      );
    });

    expect(recoverable).toBeDefined();
    expect(() => resolveUtilityRecipe('not-a-tailwind-utility', theme)).toThrow('cannot compile utility');
    expect(() => resolveUtilityRecipe('p-not-a-spacing-token', theme)).toThrow('cannot compile utility');
    await expect(compileUtilities(['align-baseline'], () => 'one two')).rejects.toThrow(
      'expected one generated class for fallback utility',
    );
  });
});
