import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

test('styles raw HTML and aliases utilities with spaces', async ({ page }) => {
  await page.goto(pathToFileURL(resolve(import.meta.dirname, '../../examples/html/index.html')).href);

  const main = page.locator('main');
  await expect(page.locator('style[data-cssx-runtime]')).toHaveCount(1);
  await expect(main).toHaveAttribute(
    'class',
    'mx-auto flex max-w-xl flex-col gap-4 rounded-xl bg-white p-8 text-slate-950 shadow-xl cssx-html-0',
  );
  await expect(main).toHaveCSS('display', 'flex');
  await expect(main).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect.poll(() => main.evaluate((element) => getComputedStyle(element).boxShadow)).not.toBe('none');
});
