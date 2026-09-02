import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { compileStyleRecords } from '../src/index';

interface TailwindManifest {
  readonly source: {
    readonly repository: string;
    readonly version: string;
    readonly commit: string;
    readonly snapshot: string;
  };
  readonly total: number;
  readonly supported: readonly string[];
  readonly unsupported: readonly string[];
}

const manifest = JSON.parse(
  readFileSync(fileURLToPath(new URL('./fixtures/tailwind-4.3.3.json', import.meta.url)), 'utf8'),
) as TailwindManifest;

describe('Tailwind 4.3.3 complete utility corpus', () => {
  it('accounts for every candidate from the pinned upstream IntelliSense snapshot', () => {
    const allCandidates = [...manifest.supported, ...manifest.unsupported];

    expect(manifest.source).toEqual({
      repository: 'https://github.com/tailwindlabs/tailwindcss',
      version: '4.3.3',
      commit: 'c2b24dd15fed1c59dd521bd86082f520c9f5ad0d',
      snapshot: 'packages/tailwindcss/src/__snapshots__/intellisense.test.ts.snap#getClassList-1',
    });
    expect(manifest.total).toBe(12_423);
    expect(new Set(allCandidates).size).toBe(manifest.total);
  });

  it('compiles every candidate recorded as supported', () => {
    for (const candidate of manifest.supported) {
      expect(() => compileStyleRecords({ candidate }), candidate).not.toThrow();
    }
  });

  it('fails explicitly for every candidate outside the CSSX compatibility surface', () => {
    for (const candidate of manifest.unsupported) {
      expect(() => compileStyleRecords({ candidate }), candidate).toThrow();
    }
  });
});
