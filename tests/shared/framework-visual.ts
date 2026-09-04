import { expect, test } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const hmrFixtures = {
  astro: {
    source: 'astro/src/styles.ts',
    from: 'text-slate-900',
    to: 'text-red-500',
    selector: 'main h1',
    property: 'color',
    stateful: false,
  },
  gatsby: {
    source: 'gatsby/src/pages/index.tsx',
    from: 'bg-purple-50',
    to: 'bg-red-500',
    selector: 'main',
    property: 'backgroundColor',
    stateful: true,
  },
  next: {
    source: 'next/app/page.tsx',
    from: 'bg-slate-100',
    to: 'bg-red-500',
    selector: 'main',
    parent: true,
    property: 'backgroundColor',
    stateful: false,
  },
  react: {
    source: 'react/src/App.jsx',
    from: 'bg-slate-950',
    to: 'bg-red-500',
    selector: 'main',
    property: 'backgroundColor',
    stateful: true,
  },
  vite: {
    source: 'vite/src/App.tsx',
    from: 'bg-slate-950',
    to: 'bg-red-500',
    selector: 'main',
    property: 'backgroundColor',
    stateful: true,
  },
  remix: {
    source: 'remix/app/routes/_index.tsx',
    from: 'bg-orange-50',
    to: 'bg-red-500',
    selector: 'main',
    property: 'backgroundColor',
    stateful: true,
  },
  solid: {
    source: 'solid/src/App.tsx',
    from: 'bg-slate-950',
    to: 'bg-red-500',
    selector: 'main',
    property: 'backgroundColor',
    stateful: false,
  },
} as const;

/** Registers the common smoke and visual assertions for one framework fixture. */
export function frameworkVisualSuite(framework: string): void {
  const mode = process.env.CSSX_VISUAL_MODE ?? 'development';

  test.describe(`${framework} (${mode})`, () => {
    test('serves the CSSX example with an extracted stylesheet', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('body')).toBeVisible();
      await expect(page.locator('link[rel="stylesheet"][href*="cssx"]')).toHaveCount(1);

      const stylesheet = page.locator('link[rel="stylesheet"][href*="cssx"]');
      await expect(stylesheet).toHaveAttribute('href', /cssx\.css/);
      const href = await stylesheet.getAttribute('href');
      expect(href).toBeTruthy();
      const response = await page.request.get(new URL(href!, page.url()).href);
      expect(response.ok()).toBe(true);
      const css = await response.text();
      const classNames = await page
        .locator('[data-cssx-probe]')
        .evaluateAll((elements) =>
          elements.flatMap((element) => (element.getAttribute('class') ?? '').split(/\s+/).filter(Boolean)),
        );
      expect(classNames.length).toBeGreaterThan(0);
      for (const className of classNames) {
        expect(css).toContain(`.${className}`);
      }

      if (process.env.CSSX_VISUAL_SCREENSHOTS !== '0') {
        await expect(page).toHaveScreenshot(`${framework}-${mode}-home.png`, { fullPage: true });
      }
    });

    test('hot-reloads CSSX styles without navigating', async ({ page }) => {
      test.skip(mode !== 'development', 'Stylesheet HMR only runs during development.');
      const fixture = hmrFixtures[framework as keyof typeof hmrFixtures];
      if (!fixture) {
        throw new Error(`No CSSX HMR fixture is configured for ${framework}.`);
      }
      const sourcePath = resolve(import.meta.dirname, '../../examples', fixture.source);
      const source = await readFile(sourcePath, 'utf8');
      const from = source.includes(fixture.from) ? fixture.from : fixture.to;
      const to = from === fixture.from ? fixture.to : fixture.from;
      if (!source.includes(from)) {
        throw new Error(`Expected a CSSX HMR token in ${sourcePath}.`);
      }

      await page.addInitScript(() => {
        const key = '__cssxDocumentLoads';
        sessionStorage.setItem(key, String(Number(sessionStorage.getItem(key) ?? '0') + 1));
      });
      await page.goto('/');
      const target = fixture.parent ? page.locator(fixture.selector).locator('..') : page.locator(fixture.selector);
      const stylesheet = page.locator('link[rel="stylesheet"][href*="cssx"]');
      const beforeColor = await target.evaluate(
        (element, property) => getComputedStyle(element)[property as 'backgroundColor' | 'color'],
        fixture.property,
      );
      const beforeClass = await target.getAttribute('class');
      const beforeLoads = await page.evaluate(() => Number(sessionStorage.getItem('__cssxDocumentLoads')));
      if (fixture.stateful) {
        await page.getByRole('button', { name: /count is 0/i }).click();
        await expect(page.getByRole('button', { name: /count is 1/i })).toBeVisible();
      }

      await writeFile(sourcePath, source.replace(from, to));
      try {
        await expect
          .poll(() =>
            target.evaluate(
              (element, property) => getComputedStyle(element)[property as 'backgroundColor' | 'color'],
              fixture.property,
            ),
          )
          .not.toBe(beforeColor);
        await expect
          .poll(() => page.evaluate(() => Number(sessionStorage.getItem('__cssxDocumentLoads'))))
          .toBe(beforeLoads);
        await expect
          .poll(() => stylesheet.evaluateAll((links) => links.some((link) => /[?&](?:t|cssx)=/.test(link.href))))
          .toBe(true);
        if (fixture.stateful) {
          await expect(page.getByRole('button', { name: /count is 1/i })).toBeVisible();
        }
        if (framework === 'astro') {
          await expect(target).toHaveAttribute('class', beforeClass ?? '');
        }
      } finally {
        await writeFile(sourcePath, source);
      }
    });
  });
}
