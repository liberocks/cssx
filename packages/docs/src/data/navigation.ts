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
