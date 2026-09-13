import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { workspaceRoot } from './package-contract-data';

/**
 * Computes SHA-256 hashes for artifacts listed in the compiler build manifest.
 *
 * @param root Optional workspace root, useful for isolated fixtures.
 * @returns Artifact paths mapped to their SHA-256 checksums.
 */
export async function compilerArtifactHashes(root = workspaceRoot): Promise<Readonly<Record<string, string>>> {
  const manifest = JSON.parse(await readFile(join(root, 'packages/compiler/dist/BUILD_MANIFEST.json'), 'utf8')) as {
    readonly artifacts: Readonly<Record<string, string>>;
  };
  return Object.fromEntries(
    await Promise.all(
      Object.keys(manifest.artifacts).map(async (artifact) => [
        artifact,
        createHash('sha256')
          .update(await readFile(join(root, 'packages/compiler', artifact)))
          .digest('hex'),
      ]),
    ),
  );
}
