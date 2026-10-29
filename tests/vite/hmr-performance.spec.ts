import { expect, test } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

test('shows 30 warm Vite style edits within 100 ms and preserves browser state', async ({ page }) => {
  test.skip(process.env.CSSX_VISUAL_MODE !== 'development', 'CSSX development HMR is only active in development.');

  const sourcePath = resolve(import.meta.dirname, '../../examples/vite/src/App.tsx');
  const originalSource = await readFile(sourcePath, 'utf8');
  let source = originalSource;
  const selector = '[data-cssx-probe="sx"]';

  await page.addInitScript(() => {
    const key = '__cssxDocumentLoads';
    sessionStorage.setItem(key, String(Number(sessionStorage.getItem(key) ?? '0') + 1));
  });
  await page.goto('/');
  await expect(page.locator(selector)).toBeVisible();
  await page.waitForFunction(() => {
    const state = (window as Window & { __cssxViteStylesheetHmr?: { source?: EventSource; revision?: number } })
      .__cssxViteStylesheetHmr;
    return state?.source?.readyState === EventSource.OPEN && (state.revision ?? 0) > 0;
  });
  await page.waitForFunction(() => {
    const state = (window as Window & { __cssxViteStylesheetHmr?: { style?: HTMLStyleElement } })
      .__cssxViteStylesheetHmr;
    return state?.style?.isConnected === true;
  });
  await page.evaluate(() => {
    const windowState = window as Window & {
      __cssxViteStylesheetHmr?: { style?: HTMLStyleElement };
      __cssxInitialBridgeStyle?: HTMLStyleElement;
    };
    windowState.__cssxInitialBridgeStyle = windowState.__cssxViteStylesheetHmr?.style;
  });
  const initialLoads = await page.evaluate(() => Number(sessionStorage.getItem('__cssxDocumentLoads')));
  await page.locator(selector).click();
  await page.locator(selector).click();
  await page.locator(selector).click();
  await page.evaluate(() => {
    const probe = document.createElement('input');
    probe.setAttribute('data-cssx-hmr-state', '');
    probe.value = 'preserve this input';
    document.body.append(probe);
    const spacer = document.createElement('div');
    spacer.style.height = '2000px';
    document.body.append(spacer);
    const state = window as Window & { __cssxHmrInput?: HTMLInputElement };
    state.__cssxHmrInput = probe;
    probe.focus();
    window.scrollTo(0, 900);
  });

  const measurements: number[] = [];
  try {
    for (let edit = 0; edit < 30; edit++) {
      const to = edit % 2 === 0 ? 'red-500' : 'blue-500';
      const from = edit === 0 ? 'brand' : edit % 2 === 0 ? 'blue-500' : 'red-500';
      source = source.replace(`bg-${from}`, `bg-${to}`);
      const expectedColor = to === 'red-500' ? 'oklch(0.6371 0.237 25.331)' : 'oklch(0.6227 0.214 259.815)';
      const visible = page.evaluate(
        (color) =>
          new Promise<void>((resolve, reject) => {
            const timeout = window.setTimeout(
              () => reject(new Error('The Vite stylesheet update did not arrive.')),
              5_000,
            );
            const style = document.querySelector('style[data-cssx-development-stylesheet]');
            if (style === null) {
              window.clearTimeout(timeout);
              reject(new Error('The Vite development stylesheet is missing.'));
              return;
            }
            const observer = new MutationObserver(() => check());
            observer.observe(style, { characterData: true, childList: true, subtree: true });
            const check = () => {
              const element = document.querySelector('[data-cssx-probe="sx"]');
              if (element !== null && getComputedStyle(element).backgroundColor === color) {
                observer.disconnect();
                requestAnimationFrame(() => {
                  window.clearTimeout(timeout);
                  resolve();
                });
                return;
              }
            };
            check();
          }),
        expectedColor,
      );
      await writeFile(sourcePath, source);
      const saved = Date.now();
      await visible;
      measurements.push(Date.now() - saved);
      const result = await page.evaluate(() => {
        const state = window as Window & {
          __cssxDocumentLoads?: string;
          __cssxHmrInput?: HTMLInputElement;
          __cssxViteStylesheetHmr?: { style?: HTMLStyleElement };
          __cssxInitialBridgeStyle?: HTMLStyleElement;
        };
        return {
          documentLoads: Number(sessionStorage.getItem('__cssxDocumentLoads')),
          inputValue: state.__cssxHmrInput?.value,
          inputFocused: document.activeElement === state.__cssxHmrInput,
          inputIdentityPreserved: state.__cssxHmrInput === document.querySelector('[data-cssx-hmr-state]'),
          scrollY: window.scrollY,
          count: document.querySelector('[data-cssx-probe="sx"]')?.textContent,
          bridgeStylePreserved:
            state.__cssxInitialBridgeStyle === state.__cssxViteStylesheetHmr?.style &&
            state.__cssxInitialBridgeStyle?.isConnected === true,
          bridgeStyleCount: document.querySelectorAll('style[data-cssx-development-stylesheet]').length,
        };
      });
      expect(result.documentLoads).toBe(initialLoads);
      expect(result.inputValue).toBe('preserve this input');
      expect(result.inputFocused).toBe(true);
      expect(result.inputIdentityPreserved).toBe(true);
      expect(result.scrollY).toBeGreaterThanOrEqual(850);
      expect(result.count).toContain('count is 3');
      expect(result.bridgeStylePreserved).toBe(true);
      expect(result.bridgeStyleCount).toBe(1);
    }
    const sorted = [...measurements].sort((left, right) => left - right);
    console.info(
      `Vite warm HMR: p50 ${sorted[14]!.toFixed(1)} ms, p95 ${sorted[28]!.toFixed(1)} ms, max ${sorted[29]!.toFixed(1)} ms.`,
    );
    expect(sorted[29]).toBeLessThanOrEqual(100);
  } finally {
    await writeFile(sourcePath, originalSource);
  }
});
