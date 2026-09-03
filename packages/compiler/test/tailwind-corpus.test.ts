import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { compileStyleRecords } from '../src/index';

interface TailwindManifest {
  readonly source: {
    readonly repository: string;
    readonly major: number;
    readonly version: string;
    readonly commit: string;
    readonly snapshot: string;
  };
  readonly total: number;
  readonly supported: readonly string[];
  readonly unsupported: readonly string[];
}

const manifest = JSON.parse(
  readFileSync(fileURLToPath(new URL('./fixtures/tailwind-4.json', import.meta.url)), 'utf8'),
) as TailwindManifest;

describe('Tailwind 4 complete utility corpus', () => {
  it('accounts for every candidate from the upstream IntelliSense snapshot', () => {
    const allCandidates = [...manifest.supported, ...manifest.unsupported];

    expect(manifest.source).toMatchObject({
      repository: 'https://github.com/tailwindlabs/tailwindcss',
      major: 4,
      snapshot: 'packages/tailwindcss/src/__snapshots__/intellisense.test.ts.snap#getClassList-1',
    });
    expect(manifest.source.version).toMatch(/^4\./);
    expect(manifest.source.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(new Set(allCandidates).size).toBe(manifest.total);
  });

  it('compiles every candidate recorded as supported', () => {
    for (const candidate of manifest.supported) {
      expect(() => compileStyleRecords({ candidate }), candidate).not.toThrow();
    }
  }, 20_000);

  it('fails explicitly for every candidate outside the CSSX compatibility surface', () => {
    for (const candidate of manifest.unsupported) {
      expect(() => compileStyleRecords({ candidate }), candidate).toThrow();
    }
  });
});
