import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';

import { stableModuleFileName } from './stable-module-file-name';

it('keeps production source-relative identities unchanged', () => {
  expect(stableModuleFileName('/project', '/project/src/Button.tsx', false)).toBe('src/Button.tsx');
});

it('canonicalizes symlinked development roots and module paths', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'cssx-stable-module-'));
  const realRoot = join(directory, 'workspace');
  const linkedRoot = join(directory, 'workspace-link');
  const fileName = join(realRoot, 'src', 'Button.tsx');
  try {
    await mkdir(join(realRoot, 'src'), { recursive: true });
    await writeFile(fileName, 'export const button = true;');
    await symlink(realRoot, linkedRoot, 'dir');

    expect(stableModuleFileName(linkedRoot, join(linkedRoot, 'src', 'Button.tsx'), true)).toBe('src/Button.tsx');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

it('falls back to resolved paths when a development module has been removed', () => {
  expect(stableModuleFileName('/missing/project', '/missing/project/src/Removed.tsx', true)).toBe('src/Removed.tsx');
});
