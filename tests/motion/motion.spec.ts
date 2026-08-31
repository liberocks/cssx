import { expect, test } from '@playwright/test';
import { compileUtilities } from '../../packages/compiler/src/index';

/** Creates deterministic class names for browser motion fixtures. */
function className(candidate: string): string {
  let hash = 5381;
  for (const character of candidate) {
    hash = (hash * 33) ^ character.charCodeAt(0);
  }
  return `m${(hash >>> 0).toString(36)}`;
}

test.describe('CSSX native motion', () => {
  test('runs a referenced keyframe animation without a motion runtime', async ({ page }) => {
    const compilation = await compileUtilities(['animate-fade-in'], className);
    await page.setContent(
      `<style>${compilation.css}</style><div id="target" class="${compilation.classes['animate-fade-in']}">Visible</div>`,
    );

    await expect
      .poll(() => page.locator('#target').evaluate((element) => getComputedStyle(element).animationName))
      .toBe('fade-in');
    await expect.poll(() => page.locator('#target').evaluate((element) => getComputedStyle(element).opacity)).toBe('1');
  });

  test('honors the reduced-motion environment variant', async ({ page }) => {
    const compilation = await compileUtilities(
      ['transition-opacity', 'duration-slow', 'motion-reduce:duration-instant'],
      className,
    );
    const classes = Object.values(compilation.classes).join(' ');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setContent(`<style>${compilation.css}</style><div id="target" class="${classes}">Reduced</div>`);

    await expect
      .poll(() => page.locator('#target').evaluate((element) => getComputedStyle(element).transitionDuration))
      .toBe('0s');
  });

  test('keeps timeline enhancements static when unsupported', async ({ page }) => {
    const compilation = await compileUtilities(
      ['animation-name-fade-in', 'animation-timeline-view-block', 'animation-range-entry'],
      className,
    );
    const classes = Object.values(compilation.classes).join(' ');
    await page.setContent(`<style>${compilation.css}</style><div id="target" class="${classes}">Timeline</div>`);

    await expect
      .poll(() => page.locator('#target').evaluate((element) => getComputedStyle(element).animationName))
      .toBe('fade-in');
    expect(compilation.css).toContain('@supports (animation-timeline: scroll())');
    expect(compilation.css).toContain('@supports (animation-range: normal)');
  });

  test('styles an externally initiated View Transition snapshot', async ({ page }) => {
    const compilation = await compileUtilities(['view-transition-name-[hero]', 'vt-old-[hero]:opacity-0'], className);
    await page.setContent(
      `<style>${compilation.css}</style><div id="target" class="${compilation.classes['view-transition-name-[hero]']}">Before</div>`,
    );
    const supported = await page.evaluate(() => typeof document.startViewTransition === 'function');
    test.skip(!supported, 'View Transitions are not available in this browser.');

    const opacity = await page.evaluate(async (pseudoClass) => {
      document.documentElement.className = pseudoClass;
      const target = document.querySelector('#target');
      const transition = document.startViewTransition(() => {
        if (target) target.textContent = 'After';
      });
      await transition.ready;
      const value = getComputedStyle(document.documentElement, '::view-transition-old(hero)').opacity;
      await transition.finished;
      return value;
    }, compilation.classes['vt-old-[hero]:opacity-0'] ?? '');
    expect(opacity).toBe('0');
  });
});
