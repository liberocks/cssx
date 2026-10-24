import { parseTheme, validateUtilityCandidate } from '@cssxio/compiler';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';

// @ts-expect-error The extension catalog is JavaScript without declaration files.
import { ALL_ENTRIES } from './catalog-entries.js';

interface Corpus {
  candidates: string[];
}

interface Catalog {
  candidates: string[];
  colors: Record<string, string>;
}

const root = fileURLToPath(new URL('../../../', import.meta.url));
const corpus = JSON.parse(
  readFileSync(new URL('../../compiler/src/fixtures/corpus.json', import.meta.url), 'utf8'),
) as Corpus;
const catalog = JSON.parse(readFileSync(new URL('../catalog-generated.json', import.meta.url), 'utf8')) as Catalog;

it('contains the complete compiler corpus, built-in color families, and deterministic generated data', () => {
  const entries = new Set(catalog.candidates);

  expect(catalog.candidates.length).toBeGreaterThan(corpus.candidates.length);
  expect(new Set(catalog.candidates).size).toBe(catalog.candidates.length);
  expect(corpus.candidates.every((candidate) => entries.has(candidate))).toBe(true);
  expect(entries.has('text-sm')).toBe(true);
  expect(entries.has('bg-steel-500')).toBe(true);
  expect(catalog.colors['red-500']).toMatch(/^#[\da-f]{6}$/i);
  expect(catalog.colors['steel-500']).toMatch(/^#[\da-f]{6}$/i);
  expect(() =>
    execFileSync(process.execPath, ['scripts/generate-intellisense-catalog.mjs', '--check'], { cwd: root }),
  ).not.toThrow();
});

it('keeps generated CSSX and theme-color candidates valid in the compiler', () => {
  const compilerCandidates = new Set(corpus.candidates);
  const generatedCandidates = catalog.candidates.filter(
    (candidate) => !compilerCandidates.has(candidate) && !candidate.endsWith(':'),
  );
  const colorCandidates = ALL_ENTRIES.filter((entry: { colorHex?: string }) => entry.colorHex).map(
    (entry: { label: string }) => entry.label,
  );
  const theme = parseTheme('');
  const invalid: string[] = [];

  for (const candidate of [...generatedCandidates, ...colorCandidates]) {
    try {
      validateUtilityCandidate(candidate, theme);
    } catch {
      invalid.push(candidate);
    }
  }
  expect(invalid).toEqual([]);
});
