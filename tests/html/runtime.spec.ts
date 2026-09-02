import { expect, test } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

test('styles the raw HTML example without rewriting classes', async ({ page }) => {
  await page.goto(pathToFileURL(resolve(import.meta.dirname, '../../examples/html/index.html')).href);

  const main = page.locator('main');
  await expect(page.locator('style[data-cssx-runtime]')).toHaveCount(1);
  await expect(main).toHaveAttribute(
    'class',
    'mx-auto flex max-w-xl flex-col gap-4 rounded-xl bg-white p-8 text-slate-950 shadow-xl',
  );
  await expect(main).toHaveCSS('display', 'flex');
  await expect(main).toHaveCSS('background-color', 'rgb(255, 255, 255)');
});
