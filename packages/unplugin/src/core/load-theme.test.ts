import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';

import { loadTheme } from './load-theme';

it('loads inline theme source', async () => {
  await expect(loadTheme({ theme: '@theme { --spacing: 2px; }' })).resolves.toContain('--spacing');
});

it('caches a file theme until its file signature changes', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-theme-cache-'));
  const themeFile = join(root, 'theme.css');
  try {
    await writeFile(themeFile, '@theme { --spacing: 2px; }');
    const options = { themeFile: 'theme.css' };
    const first = await loadTheme(options, root);
    await expect(loadTheme(options, root)).resolves.toBe(first);
    await writeFile(themeFile, '@theme { --spacing: 3px; --color: red; }');
    await expect(loadTheme(options, root)).resolves.toContain('--spacing: 3px');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
