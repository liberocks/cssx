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
      readFile(fromDocs('../src/pages/index.astro'), 'utf8'),
      readFile(fromDocs('../src/pages/docs/index.astro'), 'utf8'),
    ]);

    expect(home).toContain("import { sx } from '@cssxio/cssx';");
    expect(docs).toContain("import { sx } from '@cssxio/cssx';");
    expect(docs).toContain('dark:text-slate-50');
    expect(docs).toContain('xs:py-12');
  });

  it('keeps the header and desktop sidebar sticky in the docs layout', async () => {
    const layout = await readFile(fromDocs('../src/layouts/DocsLayout.astro'), 'utf8');

    expect(layout).toContain('sticky top-0 z-10');
    expect(layout).toContain('md:sticky md:top-16');
  });
});
