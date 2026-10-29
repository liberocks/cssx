import { expect, test } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

test('shows 30 warm style edits and preserves browser state', async ({ page }) => {
  test.skip(process.env.CSSX_VISUAL_MODE !== 'development', 'CSSX development HMR is only active in development.');

  const sourcePath = resolve(import.meta.dirname, '../../examples/next/app/hmr-probe.tsx');
  const originalSource = await readFile(sourcePath, 'utf8');
  let source = originalSource;
  const selector = '[data-cssx-hmr]';

  await page.addInitScript(() => {
    const key = '__cssxDocumentLoads';
    sessionStorage.setItem(key, String(Number(sessionStorage.getItem(key) ?? '0') + 1));
  });
  await page.goto('/');
  await expect(page.locator(selector)).toBeVisible();
  await page.waitForFunction(() => {
    const state = (window as Window & { __cssxDevelopmentStylesheetHmr?: { style?: HTMLStyleElement } })
      .__cssxDevelopmentStylesheetHmr;
    return state?.style?.isConnected === true;
  });
  await page.evaluate(() => {
    const windowState = window as Window & {
      __cssxDevelopmentStylesheetHmr?: { style?: HTMLStyleElement };
      __cssxInitialBridgeStyle?: HTMLStyleElement;
    };
    windowState.__cssxInitialBridgeStyle = windowState.__cssxDevelopmentStylesheetHmr?.style;
  });
  const initialLoads = await page.evaluate(() => Number(sessionStorage.getItem('__cssxDocumentLoads')));
  const measurements: number[] = [];
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

  try {
    for (let edit = 0; edit < 30; edit++) {
      const from = edit % 2 === 0 ? 'bg-blue-500' : 'bg-red-500';
      const to = edit % 2 === 0 ? 'bg-red-500' : 'bg-blue-500';
      source = source.replace(`sx('p-2 ${from}')`, `sx('p-2 ${to}')`);
      await page.evaluate(
        ({ targetSelector, utility }) => {
          const element = document.querySelector(targetSelector);
          if (!element) throw new Error(`Missing HMR target: ${targetSelector}`);
          const color = document.createElement('span');
          color.style.backgroundColor = `var(--color-${utility.slice(3)})`;
          document.body.append(color);
          const expectedBackground = getComputedStyle(color).backgroundColor;
          color.remove();
          if (expectedBackground === 'rgba(0, 0, 0, 0)') {
            throw new Error(`Missing theme color for ${utility}`);
          }
          const state = window as Window & { __cssxHmrElapsed?: number; __cssxHmrStart?: number };
          state.__cssxHmrElapsed = undefined;
          state.__cssxHmrStart = performance.now();
          const check = () => {
            if (getComputedStyle(element).backgroundColor !== expectedBackground) return;
            observer.disconnect();
            requestAnimationFrame(() => {
              state.__cssxHmrElapsed = performance.now() - state.__cssxHmrStart!;
            });
          };
          const observer = new MutationObserver(check);
          observer.observe(document.head, { childList: true, subtree: true });
          check();
        },
        { targetSelector: selector, utility: to.split(' ').find((value) => value.startsWith('bg-'))! },
      );
      await writeFile(sourcePath, source);
      await page.waitForFunction(
        () => (window as Window & { __cssxHmrElapsed?: number }).__cssxHmrElapsed !== undefined,
        undefined,
        { timeout: 5_000 },
      );
      const result = await page.evaluate(() => {
        const state = window as Window & {
          __cssxDocumentLoads?: string;
          __cssxHmrElapsed?: number;
          __cssxHmrInput?: HTMLInputElement;
          __cssxDevelopmentStylesheetHmr?: { style?: HTMLStyleElement };
          __cssxInitialBridgeStyle?: HTMLStyleElement;
        };
        return {
          elapsed: state.__cssxHmrElapsed,
          documentLoads: Number(sessionStorage.getItem('__cssxDocumentLoads')),
          inputValue: state.__cssxHmrInput?.value,
          inputFocused: document.activeElement === state.__cssxHmrInput,
          inputIdentityPreserved: state.__cssxHmrInput === document.querySelector('[data-cssx-hmr-state]'),
          scrollY: window.scrollY,
          bridgeStylePreserved:
            state.__cssxInitialBridgeStyle === state.__cssxDevelopmentStylesheetHmr?.style &&
            state.__cssxInitialBridgeStyle?.isConnected === true,
          bridgeStyleCount: document.querySelectorAll('style[data-cssx-development-stylesheet]').length,
        };
      });

      measurements.push(result.elapsed!);
      expect(result.documentLoads).toBe(initialLoads);
      expect(result.inputValue).toBe('preserve this input');
      expect(result.inputFocused).toBe(true);
      expect(result.inputIdentityPreserved).toBe(true);
      expect(result.scrollY).toBeGreaterThanOrEqual(850);
      expect(result.bridgeStylePreserved).toBe(true);
      expect(result.bridgeStyleCount).toBe(1);
    }
    const sorted = [...measurements].sort((left, right) => left - right);
    console.info(
      `Next ${process.env.CSSX_NEXT_BUNDLER} warm HMR: p50 ${sorted[14]!.toFixed(1)} ms, p95 ${sorted[28]!.toFixed(1)} ms, max ${sorted[29]!.toFixed(1)} ms; samples ${measurements.map((value) => value.toFixed(1)).join(', ')}.`,
    );
    if (process.env.CSSX_ENFORCE_HMR_BUDGET !== 'false') {
      expect(sorted[29]).toBeLessThanOrEqual(100);
    }
  } finally {
    await writeFile(sourcePath, originalSource);
  }
});
