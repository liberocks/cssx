import en from './en.ts';
import jp from './jp.ts';
import type { Lang } from './type.ts';

export { plainText, renderRich } from './type.ts';
export type { Lang, Rich, RichNode } from './type.ts';

/** Locale served at unprefixed routes such as `/` and `/docs`. */
export const defaultLocale = 'en';

/** Ordered list of locales. The language toggle cycles through this list. */
export const localeCodes = ['en', 'jp'] as const;

export type Locale = (typeof localeCodes)[number];

export function isLocale(value: string): value is Locale {
  return (localeCodes as readonly string[]).includes(value);
}

export const locales: Record<Locale, Lang> = { en, jp };
