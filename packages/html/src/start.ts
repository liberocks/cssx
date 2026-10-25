import { compileSourceUtilities } from '@cssxio/compiler';
import type { DarkMode } from '@cssxio/compiler';
import { splitCandidateList } from '@cssxio/compiler';

import { collectUtilityCandidates } from './collect-utility-candidates';
import { createStylesheet } from './create-stylesheet';
import { existingStylesheet } from './existing-stylesheet';

/** Stable class aliases retained for repeated scans of one document. */
interface DocumentClassState {
  readonly classBySource: Map<string, string>;
  readonly sourceByClass: Map<string, string>;
  nextAliasIndex: number;
}

/** Per-document alias maps prevent rescans from changing emitted selectors. */
const documentClassStates = new WeakMap<Document, DocumentClassState>();

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
  const state = getDocumentClassState(document);
  const elements = [...document.querySelectorAll('[class]')];
  const reservedClassNames = new Set<string>();
  for (const element of elements) {
    for (const className of element.getAttribute('class')?.split(/\s+/).filter(Boolean) ?? []) {
      reservedClassNames.add(className);
    }
  }

  const candidates = [...collectUtilityCandidates(document, theme, state.sourceByClass)];
  const pendingAliases = new Map<string, string>();
  let nextAliasIndex = state.nextAliasIndex;
  for (const candidate of candidates) {
    if (!/\s/.test(candidate) || state.classBySource.has(candidate)) {
      continue;
    }
    let alias = '';
    do {
      alias = `cssx-html-${nextAliasIndex++}`;
    } while (reservedClassNames.has(alias));
    reservedClassNames.add(alias);
    pendingAliases.set(candidate, alias);
  }

  const sourceClassNames = Object.fromEntries([...state.classBySource, ...pendingAliases]);
  const compiled = await compileSourceUtilities(candidates, theme, { darkMode: options.darkMode }, sourceClassNames);

  for (const [candidate, alias] of pendingAliases) {
    state.classBySource.set(candidate, alias);
    state.sourceByClass.set(alias, candidate);
  }
  state.nextAliasIndex = nextAliasIndex;
  rewriteWhitespaceCandidates(elements, state.classBySource, state.sourceByClass);

  const stylesheet = existingStylesheet(document) ?? createStylesheet(document);
  stylesheet.textContent = compiled.css;
  return stylesheet;
}

/** Gets the alias state retained across repeated calls for one document. */
function getDocumentClassState(document: Document): DocumentClassState {
  let state = documentClassStates.get(document);
  if (!state) {
    state = { classBySource: new Map(), sourceByClass: new Map(), nextAliasIndex: 0 };
    documentClassStates.set(document, state);
  }
  return state;
}

/** Replaces utilities with internal whitespace by their safe browser class. */
function rewriteWhitespaceCandidates(
  elements: readonly Element[],
  classBySource: ReadonlyMap<string, string>,
  sourceByClass: ReadonlyMap<string, string>,
): void {
  for (const element of elements) {
    const className = element.getAttribute('class');
    if (!className) {
      continue;
    }
    try {
      let changed = false;
      const rewritten = splitCandidateList(className)
        .map((candidate) => {
          if (sourceByClass.has(candidate)) {
            return candidate;
          }
          const alias = classBySource.get(candidate);
          if (alias) {
            changed = true;
            return alias;
          }
          return candidate;
        })
        .join(' ');
      if (changed) {
        element.setAttribute('class', rewritten);
      }
    } catch {
      // Leave malformed class attributes untouched.
    }
  }
}
