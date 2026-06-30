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

