import { describe, expect, it, vi } from 'vitest';
// @ts-expect-error The editor extension ships CommonJS without declaration files.
import { activate, deactivate, loadEditorApi } from '../src/extension.js';

function createEditor(options: { suggestions?: boolean; classFunctions?: string[] } = {}) {
  const completionProviders: { provideCompletionItems: (...args: any[]) => any }[] = [];
  const hoverProviders: { provideHover: (...args: any[]) => any }[] = [];

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

  class Hover {
    constructor(
      readonly contents: unknown,
      readonly range: unknown,
    ) {}
  }

  return {
    CompletionItem,
    CompletionItemKind: { Keyword: 'keyword', Value: 'value' },
    Hover,
    MarkdownString,
    Range,
    completionProviders,
    hoverProviders,
    languages: {
      registerCompletionItemProvider: vi.fn((_, provider) => {
        completionProviders.push(provider);
        return { dispose() {} };
      }),
      registerHoverProvider: vi.fn((_, provider) => {
        hoverProviders.push(provider);
        return { dispose() {} };
      }),
    },
    workspace: {
      getConfiguration: vi.fn(() => ({
        get(name: string, fallback: unknown) {
          if (name === 'suggestions') {
            return options.suggestions ?? fallback;
          }
          if (name === 'classFunctions') {
            return options.classFunctions ?? [];
          }
          return fallback;
        },
      })),
    },
  };
}

function document(text: string, range: unknown = undefined) {
  return {
    getText: vi.fn(() => text.split("'").at(-1)),
    getWordRangeAtPosition: vi.fn(() => range),
    lineAt: vi.fn(() => ({ text })),
  };
}

describe('IntelliSense extension', () => {
  it('loads the editor API when activated by the host', () => {
    const editor = createEditor();

    deactivate();

    expect(loadEditorApi((name: string) => (name === 'vscode' ? editor : undefined))).toBe(editor);
  });

  it('registers completion and hover providers', () => {
    const editor = createEditor();
    const subscriptions: unknown[] = [];

    activate({ subscriptions }, editor);

    expect(subscriptions).toHaveLength(2);
    expect(editor.languages.registerCompletionItemProvider).toHaveBeenCalledWith(
      expect.arrayContaining(['typescriptreact', 'astro']),
      expect.anything(),
      ' ',
      ':',
      '-',
      '[',
      '/',
    );
  });

  it('completes utilities inside configured strings and preserves variant prefixes', () => {
    const editor = createEditor({ classFunctions: ['ui.sx+'] });
    const subscriptions: unknown[] = [];
    activate({ subscriptions }, editor);
    const provider = editor.completionProviders[0]!;
    const position = { line: 0, character: 15 };
    const range = { start: 0, end: 15 };
    const items = provider.provideCompletionItems(document("ui.sx+('hover:an", range), position);

    expect(items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'hover:animate-spin',
          insertText: 'hover:animate-spin',
          detail: 'CSSX utility',
          kind: 'value',
          range,
        }),
      ]),
    );
  });

  it('uses a cursor range and keyword completions when no word range exists', () => {
    const editor = createEditor();
    activate({ subscriptions: [] }, editor);
    const position = { line: 0, character: 4 };
    const items = editor.completionProviders[0]!.provideCompletionItems(document("sx('s"), position);
    const variant = items.find((item: { label: string }) => item.label === 'sm:');

    expect(variant).toEqual(
      expect.objectContaining({
        kind: 'keyword',
        range: expect.any(editor.Range),
        documentation: expect.objectContaining({ value: 'CSSX variant' }),
      }),
    );
  });

  it('skips completions outside CSSX strings or when suggestions are disabled', () => {
    const disabledEditor = createEditor({ suggestions: false });
    activate({ subscriptions: [] }, disabledEditor);
    expect(
      disabledEditor.completionProviders[0]!.provideCompletionItems(document("sx('p"), { line: 0, character: 5 }),
    ).toBeUndefined();

    const editor = createEditor();
    activate({ subscriptions: [] }, editor);
    expect(
      editor.completionProviders[0]!.provideCompletionItems(document('const value = 1'), { line: 0, character: 15 }),
    ).toBeUndefined();
  });

  it('provides documented hovers only for known CSSX utilities', () => {
    const editor = createEditor();
    activate({ subscriptions: [] }, editor);
    const provider = editor.hoverProviders[0]!;
    const position = { line: 0, character: 10 };
    const range = { start: 0, end: 10 };

    expect(provider.provideHover(document("sx('flex", range), position)).toEqual(
      expect.objectContaining({ contents: expect.objectContaining({ value: '**flex** — CSSX utility.' }), range }),
    );
    expect(provider.provideHover(document("sx('unknown", range), position)).toBeUndefined();
    expect(provider.provideHover(document("sx('flex"), position)).toBeUndefined();
    expect(provider.provideHover(document('const value = 1', range), position)).toBeUndefined();
  });
});
