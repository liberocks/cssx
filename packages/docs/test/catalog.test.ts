import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const fromDocs = (path: string) => fileURLToPath(new URL(path, import.meta.url));

describe('documentation catalog', () => {
  const routes = ['/', '/docs/'];

  it('uses a unique static route for every documentation page', () => {
    expect(new Set(routes).size).toBe(routes.length);
  });

  it('uses direct sx calls for the home and documentation pages', async () => {
    const [home, docs] = await Promise.all([
      readFile(fromDocs('../src/screens/index.astro'), 'utf8'),
      readFile(fromDocs('../src/screens/docs.astro'), 'utf8'),
    ]);

    expect(home).toContain("import { sx } from '@cssxio/cssx';");
    expect(docs).toContain("import { sx } from '@cssxio/cssx';");
    expect(docs).toContain('text-2xl');
    expect(home).toContain('dark:text-gray-50');
  });

  it('links the CSSX stylesheet from the shared layout', async () => {
    const layout = await readFile(fromDocs('../src/layouts/BaseLayout.astro'), 'utf8');

    expect(layout).toContain("import { sx } from '@cssxio/cssx';");
    expect(layout).toContain('href="/assets/cssx.css"');
  });
});
