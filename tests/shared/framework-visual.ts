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
      await expect(page).toHaveScreenshot(`${framework}-${mode}-home.png`, { fullPage: true });
    });

    test('hot-reloads CSSX styles without navigating', async ({ page }) => {
      test.skip(mode !== 'development', 'Stylesheet HMR only runs during development.');
      const fixture = hmrFixtures[framework as keyof typeof hmrFixtures];
      if (!fixture) {
