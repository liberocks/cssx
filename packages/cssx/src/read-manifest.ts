import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { workspaceRoot } from './package-contract-data';
import type { PackageManifest } from './package-contract-data';

/**
 * Reads and parses a package manifest from the workspace.
 *
 * @param packageDirectory Workspace-relative package directory.
 * @param root Optional workspace root, useful for isolated fixtures.
 * @returns Parsed package manifest.
 */
export async function readManifest(packageDirectory: string, root = workspaceRoot): Promise<PackageManifest> {
  return JSON.parse(await readFile(join(root, packageDirectory, 'package.json'), 'utf8')) as PackageManifest;
}
