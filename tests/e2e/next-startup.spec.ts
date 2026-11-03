import { expect, test } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

test('Next starts the stylesheet automatically and applies edits without replacing page state', async ({ page }) => {
  test.skip(process.env.CSSX_VISUAL_MODE !== 'development', 'CSSX stylesheet ownership is development-only.');

  const sourcePath = resolve(import.meta.dirname, '../../examples/next/app/hmr-probe.tsx');
  const originalSource = await readFile(sourcePath, 'utf8');
  const source = originalSource.replaceAll('\r\n', '\n');
  try {
    await page.addInitScript(() => {
      if (sessionStorage.getItem('cssx-next-document-loads') === null) {
        sessionStorage.setItem('cssx-next-document-loads', '0');
      }
      window.addEventListener('DOMContentLoaded', () => {
        sessionStorage.setItem(
          'cssx-next-document-loads',
          String(Number(sessionStorage.getItem('cssx-next-document-loads') ?? '0') + 1),
        );
      });
    });
    await page.goto('/');
    const probe = page.locator('[data-cssx-hmr]');
    await expect(probe).toBeVisible();
    await expect(probe).toHaveCSS('padding-top', '8px');
    await page.waitForFunction(() => {
      const state = (
        window as Window & {
          __cssxDevelopmentStylesheetHmr?: {
            events?: EventSource;
            receivedRevision?: number;
            revision?: number;
            style?: HTMLStyleElement;
          };
        }
      ).__cssxDevelopmentStylesheetHmr;
      return (
        state?.events?.readyState === EventSource.OPEN &&
        state.revision !== undefined &&
        state.receivedRevision === state.revision
      );
    });
    expect(await page.locator('style[data-cssx-development-stylesheet]').count()).toBe(0);
    await expect(probe).toHaveCSS('padding-top', '8px');
    const initialLoads = await page.evaluate(() => Number(sessionStorage.getItem('cssx-next-document-loads')));
    await page.evaluate(() => {
      const input = document.createElement('input');
      input.value = 'keep this value';
      input.dataset.cssxStartupState = '';
      document.body.append(input);
      const spacer = document.createElement('div');
      spacer.style.height = '1600px';
      document.body.append(spacer);
      input.focus();
      window.scrollTo(0, 700);
    });

    const updatedSource = source
      .replace("sx('p-2 bg-blue-500')", "sx('p-4 bg-blue-500')")
      .replace('HMR style', 'HMR style after Next.js HMR');
    expect(updatedSource).not.toBe(source);
    await writeFile(sourcePath, updatedSource, 'utf8');
    await expect
      .poll(() => probe.evaluate((node) => getComputedStyle(node).paddingTop), { timeout: 15_000 })
      .toBe('16px');
    await page.waitForFunction(() => {
      const state = (window as Window & { __cssxDevelopmentStylesheetHmr?: { style?: HTMLStyleElement } })
        .__cssxDevelopmentStylesheetHmr;
      return state?.style?.isConnected === true;
    });
    await expect(probe).toHaveText('HMR style after Next.js HMR');
    await page.evaluate(
      () =>
        new Promise<void>((resolveFrame) => requestAnimationFrame(() => requestAnimationFrame(() => resolveFrame()))),
    );
    await expect(page.locator('[data-cssx-startup-state]')).toHaveValue('keep this value');
    await expect(page.locator('[data-cssx-startup-state]')).toBeFocused();
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThanOrEqual(650);
    await expect
      .poll(() => page.evaluate(() => Number(sessionStorage.getItem('cssx-next-document-loads'))))
      .toBe(initialLoads);
  } finally {
    await writeFile(sourcePath, originalSource, 'utf8');
  }
});

test('accepts a lower stylesheet revision after the development server restarts', async ({ page }) => {
  test.skip(process.env.CSSX_VISUAL_MODE !== 'development', 'CSSX stylesheet ownership is development-only.');

  await page.goto('/');
  const probe = page.locator('[data-cssx-hmr]');
  await expect(probe).toBeVisible();
  await page.waitForFunction(() => {
    const state = (
      window as Window & {
        __cssxDevelopmentStylesheetHmr?: { events?: EventSource; revision?: number };
      }
    ).__cssxDevelopmentStylesheetHmr;
    return state?.events?.readyState === EventSource.OPEN && state.revision !== undefined;
  });

  const currentHash = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--cssx-dev-stylesheet-hash').trim(),
  );
  expect(currentHash).not.toBe('');
  await page.evaluate((stylesheetHash) => {
    const state = (
      window as Window & {
        __cssxDevelopmentStylesheetHmr?: { events?: EventSource };
      }
    ).__cssxDevelopmentStylesheetHmr;
    state?.events?.dispatchEvent(
      new MessageEvent('message', { data: JSON.stringify({ revision: 99, stylesheetHash }) }),
    );
  }, currentHash);
  await page.waitForFunction(
    () =>
      (window as Window & { __cssxDevelopmentStylesheetHmr?: { revision?: number } }).__cssxDevelopmentStylesheetHmr
        ?.revision === 99,
  );

  const restartedHash = 'cssx-restarted-server';
  await page.evaluate((stylesheetHash) => {
    const state = (
      window as Window & {
        __cssxDevelopmentStylesheetHmr?: { events?: EventSource };
      }
    ).__cssxDevelopmentStylesheetHmr;
    state?.events?.dispatchEvent(
      new MessageEvent('message', {
        data: JSON.stringify({
          revision: 1,
          stylesheetHash,
          css: `:root{--cssx-dev-stylesheet-hash:${stylesheetHash};}[data-cssx-hmr]{padding-top:32px;}`,
        }),
      }),
    );
  }, restartedHash);

  await expect(probe).toHaveCSS('padding-top', '32px');
  await page.waitForFunction((stylesheetHash) => {
    const state = (
      window as Window & {
        __cssxDevelopmentStylesheetHmr?: {
          revision?: number;
          stylesheetHash?: string;
          style?: HTMLStyleElement;
        };
      }
    ).__cssxDevelopmentStylesheetHmr;
    return state?.revision === 1 && state.stylesheetHash === stylesheetHash && state.style?.isConnected === true;
  }, restartedHash);
});
