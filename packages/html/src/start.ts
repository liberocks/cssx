import { compileSourceUtilities } from '@cssxio/compiler';
import type { DarkMode } from '@cssxio/compiler';
import { collectUtilityCandidates } from './collect-utility-candidates';
import { createStylesheet } from './create-stylesheet';
import { existingStylesheet } from './existing-stylesheet';

/** Options for a self-hosted CSSX HTML runtime. */
export interface StartOptions {
  /** CSSX theme source compiled into the injected stylesheet. */
  readonly theme?: string;
  /** Controls how the `dark` variant is activated. */
  readonly darkMode?: DarkMode;
  /** Document whose initial class attributes are compiled. */
  readonly document?: Document;
}

/**
 * Compiles CSSX utilities found in the initial document into one stylesheet.
 *
 * @param options Runtime configuration for a self-hosted browser bundle.
 * @returns The stylesheet added to the document head.
 */
export async function start(options: StartOptions = {}): Promise<HTMLStyleElement> {
  const document = options.document ?? globalThis.document;
  if (!document) {
    throw new Error('@cssxio/html requires a browser document.');
  }
  const theme = options.theme ?? '';
  const compiled = await compileSourceUtilities([...collectUtilityCandidates(document, theme)], theme, {
    darkMode: options.darkMode,
  });
  const stylesheet = existingStylesheet(document) ?? createStylesheet(document);
  stylesheet.textContent = compiled.css;
  return stylesheet;
}
