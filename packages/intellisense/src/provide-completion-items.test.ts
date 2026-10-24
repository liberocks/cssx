import { expect, it } from 'vitest';

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
    CompletionItemKind: { Color: 'color', Keyword: 'keyword', Value: 'value' },
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

function createDocument(text: string) {
  const lines = text.split('\n');
  const starts: number[] = [];
  lines.forEach((line, index) => starts.push(index === 0 ? 0 : starts[index - 1]! + lines[index - 1]!.length + 1));
  return {
    getText: () => text,
    offsetAt: ({ line, character }: { line: number; character: number }) => starts[line]! + character,
    positionAt(offset: number) {
      let line = 0;
      for (let index = 1; index < starts.length; index += 1) {
        if (starts[index]! > offset) {
          break;
        }
        line = index;
      }
      return { line, character: offset - starts[line]! };
    },
  };
}

it('completes multiline cssx.create strings and includes concrete text and color values', () => {
  const text = "import * as cssx from '@cssxio/cssx';\nconst styles = cssx.create({\n  root: 'text-',\n});";
  const editor = createEditor();
  const document = createDocument(text);
  const position = document.positionAt(text.indexOf('text-') + 'text-'.length);
  const items = provideCompletionItems(editor, document, position);

  expect(items).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ label: 'text-sm', kind: 'value' }),
      expect.objectContaining({ label: 'text-red-500', kind: 'color' }),
    ]),
  );
});

it('filters a utility prefix while retaining its variant and replacement range', () => {
  const text = "const value = ui.sxPlus('hover:an";
  const editor = createEditor({ classFunctions: ['ui.sxPlus'] });
  const document = createDocument(text);
  const position = document.positionAt(text.length);
  const items = provideCompletionItems(editor, document, position);

  expect(items).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        label: 'hover:animate-spin',
        insertText: 'hover:animate-spin',
        range: expect.objectContaining({
          start: { line: 0, character: text.indexOf('hover:') },
          end: { line: 0, character: text.length },
        }),
      }),
    ]),
  );
});

it('offers variant keywords when a utility string starts empty', () => {
  const text = "sx('";
  const editor = createEditor();
  const document = createDocument(text);
  const items = provideCompletionItems(editor, document, document.positionAt(text.length));

  expect(items).toEqual(expect.arrayContaining([expect.objectContaining({ label: 'sm:', kind: 'keyword' })]));
  expect(items?.[0]?.range).toBeInstanceOf(editor.Range);
});

it('preserves bracketed arbitrary-variant colons when filtering utilities', () => {
  const text = "sx('[&:hover]:text-";
  const document = createDocument(text);
  const items = provideCompletionItems(createEditor(), document, document.positionAt(text.length));

  expect(items).toEqual(
    expect.arrayContaining([expect.objectContaining({ label: '[&:hover]:text-sm', insertText: '[&:hover]:text-sm' })]),
  );
});

it('skips suggestions when disabled or outside CSSX utility strings', () => {
  const text = "sx('text-";
  const position = createDocument(text).positionAt(text.length);

  expect(provideCompletionItems(createEditor({ suggestions: false }), createDocument(text), position)).toBeUndefined();
  expect(provideCompletionItems(createEditor(), createDocument('const value = 1'), position)).toBeUndefined();
});
