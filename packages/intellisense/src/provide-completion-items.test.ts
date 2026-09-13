import { expect, it, vi } from 'vitest';

// @ts-expect-error The editor extension ships CommonJS without declaration files.
import { provideCompletionItems } from './provide-completion-items.js';

function createEditor(options: { suggestions?: boolean; classFunctions?: string[] } = {}) {
  class Range {
    constructor(
      readonly start: unknown,
      readonly end: unknown,
    ) {}
  }
  class CompletionItem {
    insertText?: string;
    range?: unknown;
    detail?: string;
    documentation?: unknown;

    constructor(
      readonly label: string,
      readonly kind: string,
    ) {}
  }
  class MarkdownString {
    constructor(readonly value: string) {}
  }
  return {
    CompletionItem,
    CompletionItemKind: { Keyword: 'keyword', Value: 'value' },
    MarkdownString,
    Range,
    workspace: {
      getConfiguration: () => ({
        get(name: string, fallback: unknown) {
          if (name === 'suggestions') {
            return options.suggestions ?? fallback;
          }
          if (name === 'classFunctions') {
            return options.classFunctions ?? [];
          }
          return fallback;
        },
      }),
    },
  };
}

function createDocument(line: string, partial: string, range: unknown = undefined) {
  return {
    getText: vi.fn(() => partial),
    getWordRangeAtPosition: vi.fn(() => range),
    lineAt: vi.fn(() => ({ text: line })),
  };
}

it('skips suggestions when disabled or outside CSSX utility strings', () => {
  const position = { line: 0, character: 8 };

  expect(
    provideCompletionItems(createEditor({ suggestions: false }), createDocument("sx('flex", 'flex'), position),
  ).toBeUndefined();
  expect(provideCompletionItems(createEditor(), createDocument('const value = 1', ''), position)).toBeUndefined();
});

it('completes a filtered utility prefix while retaining the variant prefix and source range', () => {
  const editor = createEditor({ classFunctions: ['ui.sx+'] });
  const line = "ui.sx+('hover:an";
  const range = { start: 8, end: line.length };
  const document = createDocument(line, 'hover:an', range);
  const items = provideCompletionItems(editor, document, { line: 0, character: line.length });

  expect(items).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        label: 'hover:animate-spin',
        insertText: 'hover:animate-spin',
        range,
      }),
    ]),
  );
  expect(document.getWordRangeAtPosition).toHaveBeenCalledWith({ line: 0, character: line.length }, expect.any(RegExp));
});

it('uses the cursor range when the editor has no matching word range', () => {
  const editor = createEditor();
  const line = "sx('s";
  const items = provideCompletionItems(editor, createDocument(line, 's'), { line: 0, character: line.length });

  expect(items).toEqual(expect.arrayContaining([expect.objectContaining({ label: 'sm:', kind: 'keyword' })]));
  expect(items?.[0]?.range).toBeInstanceOf(editor.Range);
});
