import { expect, it } from 'vitest';

import { loadTheme } from './load-theme';

it('loads inline theme source', async () => {
  await expect(loadTheme({ theme: '@theme { --spacing: 2px; }' })).resolves.toContain('--spacing');
});
