import type { AstroInstance } from 'astro';

import { docsMetadata } from './metadata.ts';

export type DocLocale = 'en' | 'ja';

export interface DocHeading {
  depth: number;
  slug: string;
  text: string;
}

export interface DocMetadata {
  title: string;
  description: string;
  section: 'Start here' | 'Utility syntax' | 'Utilities' | 'Advanced';
  order: number;
  keywords: readonly string[];
  headings: readonly DocHeading[];
  searchText: string;
}

export interface DocPage {
  id: string;
  data: DocMetadata;
  Content: AstroInstance['default'];
}

const docsByLocale: Record<DocLocale, Record<string, AstroInstance>> = {
  en: import.meta.glob<AstroInstance>('./en/**/*.astro', { eager: true }),
  ja: import.meta.glob<AstroInstance>('./ja/**/*.astro', { eager: true }),
};

export function getDocs(locale: DocLocale): DocPage[] {
  return Object.entries(docsByLocale[locale])
    .map(([path, module]) => {
      const id = path.replace(/^\.\/(?:en|ja)\//, '').replace(/\.astro$/, '');
      const data = docsMetadata[id];

      if (!data) {
        throw new Error(`Missing documentation metadata for ${id}`);
      }

      return { id, data, Content: module.default };
    })
    .sort((a, b) => a.data.order - b.data.order);
}
