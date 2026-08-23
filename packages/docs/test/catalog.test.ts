import { describe, expect, it, vi } from 'vitest';
import { navigation } from '../src/data/navigation';

vi.mock('@cssxio/cssx', () => ({
  create: <T>(styles: T) => styles,
  props: (value: string) => ({ className: value }),
}));

describe('documentation catalog', () => {
  const routes = [
    '/',
    '/docs/installation',
    '/docs/integrations',
    '/docs/editor-support',
    '/docs/styling',
    '/docs/variants',
    '/docs/theme',
    '/docs/arbitrary-values',
    '/docs/build-output',
    '/docs/utilities/layout',
    '/docs/utilities/flexbox-grid',
    '/docs/utilities/spacing-sizing',
    '/docs/utilities/typography',
    '/docs/utilities/backgrounds-gradients',
    '/docs/utilities/borders-effects',
    '/docs/utilities/filters-masks',
    '/docs/utilities/motion-transforms',
    '/docs/utilities/interactivity-scrolling',
    '/docs/utilities/tables-svg-accessibility',
  ];

  it('uses a unique static route for every documentation page', () => {
    expect(new Set(routes).size).toBe(routes.length);
  });

  it('links every navigation entry to a generated documentation route', () => {
    const staticRoutes = new Set(routes);

    for (const item of navigation.flatMap((group) => group.items)) {
      expect(staticRoutes.has(item.href)).toBe(true);
    }
  });

  it('maps every documentation style surface to a compiled class name', async () => {
    const { classes } = await import('../src/styles');

    expect(classes.page).toBe('min-h-screen bg-gray-50 text-gray-900');
    expect(classes.header).toBe('border-b border-gray-200 bg-white');
    expect(classes.sidebar).toBe('hidden w-56 shrink-0 lg:block');
    expect(classes.table).toBe('min-w-full border-collapse text-left text-sm');
    expect(Object.keys(classes).length).toBeGreaterThan(30);
  });
});
