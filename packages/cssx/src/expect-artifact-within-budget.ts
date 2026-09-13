import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';
import { expect } from 'vitest';

import { workspaceRoot } from './package-contract-data';

/**
 * Asserts that an artifact fits raw, gzip, and Brotli byte budgets.
 *
 * @param path Workspace-relative artifact path.
 * @param budget Size limits for each artifact representation.
 * @param budget.raw Maximum uncompressed byte size.
 * @param budget.gzip Maximum gzip-compressed byte size.
 * @param budget.brotli Maximum Brotli-compressed byte size.
 * @param root Optional workspace root, useful for isolated fixtures.
 */
export async function expectArtifactWithinBudget(
  path: string,
  budget: { readonly raw: number; readonly gzip: number; readonly brotli: number },
  root = workspaceRoot,
): Promise<void> {
  const artifact = await readFile(join(root, path));

  expect(artifact.byteLength, `${path} raw bytes`).toBeLessThanOrEqual(budget.raw);
  expect(gzipSync(artifact).byteLength, `${path} gzip bytes`).toBeLessThanOrEqual(budget.gzip);
  expect(
    brotliCompressSync(artifact, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).byteLength,
    `${path} Brotli bytes`,
  ).toBeLessThanOrEqual(budget.brotli);
}
