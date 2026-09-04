import { expect, test } from '@playwright/test';

test.describe('Next App Router CSSX stylesheet', () => {
  test('includes CSSX rules from both server and client components', async ({ page, request }) => {
    test.skip(process.env.CSSX_VISUAL_MODE !== 'production', 'This regression requires a production Next build.');

    await page.goto('/');
    const html = await page.content();
    const stylesheet = await page.locator('link[rel="stylesheet"][href="/_next/static/cssx.css"]').getAttribute('href');
    expect(stylesheet).toBe('/_next/static/cssx.css');

    const response = await request.get(stylesheet!);
    expect(response.ok()).toBe(true);
    const css = await response.text();
    const classNames = [...html.matchAll(/\bclass="([^"]+)"/g)]
      .flatMap((match) => match[1]?.split(/\s+/) ?? [])
      .filter((className) => /^s[0-9A-Za-z]+x$/.test(className));

    expect(classNames.length).toBeGreaterThan(0);
    expect(classNames.every((className) => css.includes(`.${className}`))).toBe(true);
  });
});
