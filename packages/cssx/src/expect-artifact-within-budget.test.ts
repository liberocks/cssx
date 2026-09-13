import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';

import { expectArtifactWithinBudget } from './expect-artifact-within-budget';

it('accepts artifacts under all three size limits', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'cssx-artifact-budget-'));
  try {
    await writeFile(join(directory, 'artifact.js'), 'small artifact');

    await expectArtifactWithinBudget('artifact.js', { raw: 100, gzip: 100, brotli: 100 }, directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

it.each([
  [{ raw: 1, gzip: 100, brotli: 100 }, 'raw bytes'],
  [{ raw: 2_000, gzip: 1, brotli: 100 }, 'gzip bytes'],
  [{ raw: 2_000, gzip: 100, brotli: 1 }, 'Brotli bytes'],
] as const)('rejects an artifact that exceeds the %s limit', async (budget, description) => {
  const directory = await mkdtemp(join(tmpdir(), 'cssx-artifact-budget-'));
  try {
    await writeFile(join(directory, 'artifact.js'), 'a'.repeat(1_000));

    await expect(expectArtifactWithinBudget('artifact.js', budget, directory)).rejects.toThrow(description);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
