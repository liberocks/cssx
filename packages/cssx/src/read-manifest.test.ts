import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, it } from 'vitest';

import { readManifest } from './read-manifest';

const directories: string[] = [];

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

it('reads a package manifest relative to a supplied root', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-manifest-'));
  directories.push(root);
  const packageDirectory = join(root, 'packages', 'fixture');
  await mkdir(packageDirectory, { recursive: true });
  await writeFile(join(packageDirectory, 'package.json'), JSON.stringify({ name: 'fixture', exports: {} }));

  await expect(readManifest('packages/fixture', root)).resolves.toEqual({ name: 'fixture', exports: {} });
});
