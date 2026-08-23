export interface NavigationItem {
  readonly label: string;
  readonly href: string;
}

export interface NavigationGroup {
  readonly label: string;
  readonly items: readonly NavigationItem[];
}

export const navigation: readonly NavigationGroup[] = [
  {
    label: 'Getting started',
    items: [
      { label: 'Introduction', href: '/' },
      { label: 'Installation', href: '/docs/installation' },
      { label: 'Integrations', href: '/docs/integrations' },
      { label: 'Editor support', href: '/docs/editor-support' },
    ],
  },
  {
    label: 'Core concepts',
    items: [
      { label: 'Styling with CSSX', href: '/docs/styling' },
      { label: 'Variants', href: '/docs/variants' },
      { label: 'Theme', href: '/docs/theme' },
      { label: 'Arbitrary values', href: '/docs/arbitrary-values' },
      { label: 'Build output', href: '/docs/build-output' },
    ],
  },
  {
    label: 'Utility reference',
    items: [
      { label: 'Layout', href: '/docs/utilities/layout' },
      { label: 'Flexbox and grid', href: '/docs/utilities/flexbox-grid' },
      { label: 'Spacing and sizing', href: '/docs/utilities/spacing-sizing' },
      { label: 'Typography', href: '/docs/utilities/typography' },
      { label: 'Backgrounds and gradients', href: '/docs/utilities/backgrounds-gradients' },
      { label: 'Borders and effects', href: '/docs/utilities/borders-effects' },
      { label: 'Filters and masks', href: '/docs/utilities/filters-masks' },
      { label: 'Motion and transforms', href: '/docs/utilities/motion-transforms' },
      { label: 'Interactivity and scrolling', href: '/docs/utilities/interactivity-scrolling' },
      { label: 'Tables, SVG, accessibility', href: '/docs/utilities/tables-svg-accessibility' },
    ],
  },
];
