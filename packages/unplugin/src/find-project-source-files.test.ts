import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';

import { findProjectSourceFiles } from './find-project-source-files';

it('returns supported source extensions in sorted order', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-source-files-'));
  try {
    const extensions = [
      '.js',
      '.jsx',
      '.ts',
      '.tsx',
      '.cjs',
      '.cjsx',
      '.cts',
      '.ctsx',
      '.mjs',
      '.mjsx',
      '.mts',
      '.mtsx',
      '.astro',
    ];
    await Promise.all(extensions.map((extension) => writeFile(join(root, `source${extension}`), '')));

    await expect(findProjectSourceFiles(root)).resolves.toEqual(
      extensions.map((extension) => join(root, `source${extension}`)).sort(),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

it('skips ignored directories, non-source files, and symbolic links', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-source-files-'));
  try {
    const source = join(root, 'src');
    await mkdir(source, { recursive: true });
    await writeFile(join(source, 'plain.ts'), '');
    await writeFile(join(source, 'notes.txt'), '');
    await symlink(join(source, 'plain.ts'), join(source, 'linked.ts'));

    for (const directory of ['.git', '.next', '.turbo', 'node_modules']) {
      await mkdir(join(root, directory), { recursive: true });
      await writeFile(join(root, directory, 'hidden.ts'), '');
    }

    await expect(findProjectSourceFiles(root)).resolves.toEqual([join(source, 'plain.ts')]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
