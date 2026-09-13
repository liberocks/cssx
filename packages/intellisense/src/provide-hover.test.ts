import { expect, it } from 'vitest';

// @ts-expect-error The editor extension ships CommonJS without declaration files.
import { provideHover } from './provide-hover.js';

function createEditor() {
  class MarkdownString {
    constructor(readonly value: string) {}
  }
  class Hover {
    constructor(
      readonly contents: unknown,
      readonly range: unknown,
    ) {}
  }
  return {
    Hover,
    MarkdownString,
    workspace: { getConfiguration: () => ({ get: (_name: string, fallback: unknown) => fallback }) },
  };
}

function createDocument(line: string, text: string, range: unknown) {
  return {
    getText: () => text,
    getWordRangeAtPosition: () => range,
    lineAt: () => ({ text: line }),
  };
}

it('returns documentation for known CSSX utility strings', () => {
  const editor = createEditor();
  const range = { start: 3, end: 7 };
  const hover = provideHover(editor, createDocument("sx('flex", 'flex', range), { line: 0, character: 7 });

  expect(hover).toEqual(
    expect.objectContaining({
      contents: expect.objectContaining({ value: '**flex** — CSSX utility.' }),
      range,
    }),
  );
});

it('returns no hover outside utility strings, without a word range, or for unknown utilities', () => {
  const editor = createEditor();
  const position = { line: 0, character: 12 };

  expect(provideHover(editor, createDocument('const value = 1', 'flex', {}), position)).toBeUndefined();
  expect(provideHover(editor, createDocument("sx('flex", 'flex', undefined), position)).toBeUndefined();
  expect(provideHover(editor, createDocument("sx('unknown", 'unknown', {}), position)).toBeUndefined();
});
