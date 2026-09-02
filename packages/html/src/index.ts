import { compileSourceUtilities, parseTheme, splitCandidateList, validateUtilityCandidate } from '@cssxio/compiler';
import type { DarkMode } from '@cssxio/compiler';

/** Options for a self-hosted CSSX HTML runtime. */
export interface StartOptions {
  /** CSSX theme source compiled into the injected stylesheet. */
  readonly theme?: string;
  /** Controls how the `dark` variant is activated. */
  readonly darkMode?: DarkMode;
  /** Document whose initial class attributes are compiled. */
  readonly document?: Document;
}

/** Attribute used to identify the stylesheet injected by this runtime. */
export const RUNTIME_STYLESHEET_ATTRIBUTE = 'data-cssx-runtime';

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
  const candidates = collectUtilityCandidates(document, theme);
  const compiled = await compileSourceUtilities([...candidates], theme, { darkMode: options.darkMode });
  const stylesheet = existingStylesheet(document) ?? createStylesheet(document);
  stylesheet.textContent = compiled.css;
  return stylesheet;
}

/** Finds supported CSSX utilities from all class attributes in a document. */
function collectUtilityCandidates(document: Document, themeSource: string): ReadonlySet<string> {
  const theme = parseTheme(themeSource);
  const candidates = new Set<string>();
  for (const element of document.querySelectorAll('[class]')) {
    const className = element.getAttribute('class');
    if (!className) {
      continue;
    }
    let classCandidates: readonly string[];
    try {
      classCandidates = splitCandidateList(className);
    } catch {
      continue;
    }
    for (const candidate of classCandidates) {
      try {
        validateUtilityCandidate(candidate, theme);
        candidates.add(candidate);
      } catch {
        // Normal HTML may include application and third-party classes.
      }
    }
  }
  return candidates;
}

/** Reads the stylesheet injected by an earlier start call, when present. */
function existingStylesheet(document: Document): HTMLStyleElement | null {
  return document.head.querySelector(`style[${RUNTIME_STYLESHEET_ATTRIBUTE}]`);
}

/** Creates and appends the stylesheet used by this runtime. */
function createStylesheet(document: Document): HTMLStyleElement {
  const stylesheet = document.createElement('style');
  stylesheet.setAttribute(RUNTIME_STYLESHEET_ATTRIBUTE, '');
  document.head.append(stylesheet);
  return stylesheet;
}
