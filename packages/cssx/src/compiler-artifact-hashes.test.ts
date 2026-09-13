import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';

import { compilerArtifactHashes } from './compiler-artifact-hashes';

it('hashes every artifact listed by the compiler build manifest', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-build-hashes-'));
  try {
    const compilerDirectory = join(root, 'packages/compiler');
    const distDirectory = join(compilerDirectory, 'dist');
    await mkdir(distDirectory, { recursive: true });
    const artifactPath = 'dist/index.js';
    const contents = 'compiled';
    await writeFile(join(compilerDirectory, artifactPath), contents);
    await writeFile(
      join(distDirectory, 'BUILD_MANIFEST.json'),
      JSON.stringify({ artifacts: { [artifactPath]: 'ignored manifest hash' } }),
    );

    await expect(compilerArtifactHashes(root)).resolves.toEqual({
      [artifactPath]: createHash('sha256').update(contents).digest('hex'),
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
