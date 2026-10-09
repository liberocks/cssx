import { expect, test, type Page } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const development = process.env.CSSX_VISUAL_MODE === 'development';
const fixture = resolve(import.meta.dirname, '../../examples/next/app/hmr-probe.tsx');

test('App Router styles hydrate, load as Next CSS assets, and survive route navigation', async ({ page, request }) => {
  const hydrationErrors: string[] = [];
  page.on('pageerror', (error) => hydrationErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' && /hydration/i.test(message.text())) hydrationErrors.push(message.text());
  });

  await page.goto('/');
  const client = page.locator('[data-cssx-client]');
  const mdx = page.locator('[data-cssx-mdx]');
  const dynamic = page.locator('[data-cssx-toggle]');
  await expect(client).toBeVisible();
  await expect(mdx).toBeVisible();
  await expect.poll(() => client.evaluate((node) => getComputedStyle(node).paddingTop)).toBe('12px');
  await expect.poll(() => mdx.evaluate((node) => getComputedStyle(node).paddingTop)).toBe('16px');
  const blue = await normalizedColor(page, 'oklch(62.27% 0.214 259.815)');
  const red = await normalizedColor(page, 'oklch(63.71% 0.237 25.331)');
  await expect
    .poll(async () => normalizedColor(page, await dynamic.evaluate((node) => getComputedStyle(node).backgroundColor)))
    .toBe(blue);

  await dynamic.click();
  await expect
    .poll(async () => normalizedColor(page, await dynamic.evaluate((node) => getComputedStyle(node).backgroundColor)))
    .toBe(red);
  await page.locator('[data-cssx-navigation]').click();
  await expect(page).toHaveURL(/\/second$/);
  await expect(page.locator('[data-cssx-second]')).toHaveCSS('padding-top', '32px');
  await page.goto('/second');
  await expect(page.locator('[data-cssx-second]')).toBeVisible();
  expect(hydrationErrors).toEqual([]);

  if (!development) {
    const html = await page.content();
    const classNames = [...html.matchAll(/\b(s[0-9A-Za-z]+x)\b/g)].map(([name]) => name);
    const stylesheetLinks = await page
      .locator('link[rel="stylesheet"]')
      .evaluateAll((links) =>
        links.map((link) => (link as HTMLLinkElement).href).filter((href) => href.startsWith(location.origin)),
      );
    expect(stylesheetLinks.length).toBeGreaterThan(0);
    expect(stylesheetLinks.some((href) => /\/_next\/static\/(?:css|chunks)\/[A-Za-z0-9_-]{8,}\.css/.test(href))).toBe(
      true,
    );
    const cssAssets = await Promise.all(
      stylesheetLinks.map(async (href) => {
        const response = await request.get(href);
        expect(response.ok()).toBe(true);
        return response.text();
      }),
    );
    const css = cssAssets.join('\n');
    expect(css).toContain('--color-brand:#171717');
    expect(css).toContain('background-color:var(--color-red-500)');
    expect(css).not.toContain('/static/cssx.css');
    for (const className of classNames) expect(css).toContain(`.${className}`);
  }
});

test('development edits update utilities and add CSSX call sites', async ({ page }) => {
  test.skip(!development, 'Development file edits run only against Next dev servers.');
  const original = await readFile(fixture, 'utf8');
  const source = original.replaceAll('\r\n', '\n');
  try {
    await page.goto('/');
    const probe = page.locator('[data-cssx-hmr]');
    const red = await normalizedColor(page, 'oklch(63.71% 0.237 25.331)');
    await expect(probe).toHaveCSS('padding-top', '8px');

    const changed = source
      .replace("sx('p-2 bg-blue-500')", "sx('p-6 bg-red-500')")
      .replace(
        '      HMR style\n    </div>',
        "      HMR style\n      <span data-cssx-added className={sx('rounded-full text-white')}>Added</span>\n    </div>",
      );
    expect(changed).toContain('data-cssx-added');
    await writeFile(fixture, changed, 'utf8');

    await expect
      .poll(() => probe.evaluate((node) => getComputedStyle(node).paddingTop), { timeout: 30_000 })
      .toBe('24px');
    await expect
      .poll(async () => normalizedColor(page, await probe.evaluate((node) => getComputedStyle(node).backgroundColor)), {
        timeout: 30_000,
      })
      .toBe(red);
    await expect(page.locator('[data-cssx-added]')).toHaveCSS('border-radius', '9999px');
  } finally {
    await writeFile(fixture, original, 'utf8');
  }
});

/** Returns a browser-serialized color value so CSS Color 4 and RGB output compare consistently. */
async function normalizedColor(page: Page, color: string): Promise<string> {
  return page.evaluate((value) => {
    const context = document.createElement('canvas').getContext('2d');
    if (!context) throw new Error('Canvas 2D context is unavailable.');
    context.fillStyle = value;
    context.fillRect(0, 0, 1, 1);
    return Array.from(context.getImageData(0, 0, 1, 1).data).join(',');
  }, color);
}
