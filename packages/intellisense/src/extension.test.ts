import { describe, expect, it, vi } from 'vitest';

// @ts-expect-error The editor extension ships CommonJS without declaration files.
import { activate, deactivate, loadEditorApi } from '../src/extension.js';

function createEditor(options: { suggestions?: boolean; colorDecorators?: boolean; classFunctions?: string[] } = {}) {
  const completionProviders: { provideCompletionItems: (...args: any[]) => any }[] = [];
  const hoverProviders: { provideHover: (...args: any[]) => any }[] = [];
  const colorProviders: {
    provideDocumentColors: (...args: any[]) => any;
    provideColorPresentations: (...args: any[]) => any;
  }[] = [];
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
  class Color {
    constructor(
      readonly red: number,
      readonly green: number,
      readonly blue: number,
      readonly alpha: number,
    ) {}
  }
  class ColorInformation {
    constructor(
      readonly range: unknown,
      readonly color: unknown,
    ) {}
  }
  class ColorPresentation {
    textEdit?: unknown;

    constructor(readonly label: string) {}
  }
  const TextEdit = { replace: vi.fn((range, newText) => ({ range, newText })) };
  return {
    Color,
    ColorInformation,
    ColorPresentation,
    CompletionItem,
    CompletionItemKind: { Color: 'color', Keyword: 'keyword', Value: 'value' },
    Hover,
    MarkdownString,
    Range,
    TextEdit,
    completionProviders,
    hoverProviders,
    colorProviders,
    languages: {
      registerCompletionItemProvider: vi.fn((_, provider) => {
        completionProviders.push(provider);
        return { dispose() {} };
      }),
      registerHoverProvider: vi.fn((_, provider) => {
        hoverProviders.push(provider);
        return { dispose() {} };
      }),
      registerColorProvider: vi.fn((_, provider) => {
        colorProviders.push(provider);
        return { dispose() {} };
      }),
    },
    workspace: {
      getConfiguration: vi.fn(() => ({
        get(name: string, fallback: unknown) {
          if (name === 'suggestions') {
            return options.suggestions ?? fallback;
          }
          if (name === 'colorDecorators') {
            return options.colorDecorators ?? fallback;
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

function document(text: string) {
  const lines = text.split('\n');
  const starts: number[] = [];
  lines.forEach((line, index) => starts.push(index === 0 ? 0 : starts[index - 1]! + lines[index - 1]!.length + 1));
  const offsetAt = (position: { line: number; character: number }) => starts[position.line]! + position.character;
  const positionAt = (offset: number) => {
    let line = 0;
    for (let index = 1; index < starts.length; index += 1) {
      if (starts[index]! > offset) {
        break;
      }
      line = index;
    }
    return { line, character: offset - starts[line]! };
  };
  return {
    getText: (range?: { start: { line: number; character: number }; end: { line: number; character: number } }) =>
      range ? text.slice(offsetAt(range.start), offsetAt(range.end)) : text,
    lineAt: (line: number) => ({ text: lines[line]! }),
    offsetAt,
    positionAt,
  };
}

describe('IntelliSense extension', () => {
  it('loads the editor API when activated by the host', () => {
    const editor = createEditor();

    deactivate();

    expect(loadEditorApi((name: string) => (name === 'vscode' ? editor : undefined))).toBe(editor);
  });

  it('registers completion, hover, and color providers', () => {
    const editor = createEditor();
    const subscriptions: unknown[] = [];

    activate({ subscriptions }, editor);

    expect(subscriptions).toHaveLength(3);
    expect(editor.languages.registerCompletionItemProvider).toHaveBeenCalledWith(
      expect.arrayContaining(['typescriptreact', 'astro']),
      expect.objectContaining({ provideCompletionItems: expect.any(Function) }),
      ' ',
      ':',
      '-',
      '[',
      '/',
      "'",
      '"',
      '`',
    );
    expect(editor.languages.registerColorProvider).toHaveBeenCalledWith(
      expect.arrayContaining(['typescriptreact', 'astro']),
      expect.objectContaining({ provideDocumentColors: expect.any(Function) }),
    );
  });

  it('completes configured functions and preserves their variant prefixes', () => {
    const editor = createEditor({ classFunctions: ['ui.sxPlus'] });
    activate({ subscriptions: [] }, editor);
    const source = "ui.sxPlus('hover:an";
    const position = document(source).positionAt(source.length);
    const items = editor.completionProviders[0]!.provideCompletionItems(document(source), position);

    expect(items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'hover:animate-spin',
          insertText: 'hover:animate-spin',
          detail: 'CSSX utility',
          kind: 'value',
        }),
      ]),
    );
  });

  it('provides hovers only for known CSSX utilities', () => {
    const editor = createEditor();
    activate({ subscriptions: [] }, editor);
    const provider = editor.hoverProviders[0]!;
    const source = "sx('flex";
    const position = document(source).positionAt(source.length);

    expect(provider.provideHover(document(source), position)).toEqual(
      expect.objectContaining({ contents: expect.objectContaining({ value: '**flex** — CSSX utility.' }) }),
    );
    expect(provider.provideHover(document("sx('unknown"), position)).toBeUndefined();
    expect(provider.provideHover(document('const value = 1'), position)).toBeUndefined();
  });

  it('provides color swatches and color-picker edits preserving variants and opacity', () => {
    const editor = createEditor();
    activate({ subscriptions: [] }, editor);
    const source = "import { sx } from '@cssxio/cssx';\nsx('hover:bg-red-500/50');";
    const documentSource = document(source);
    const start = source.indexOf('hover:bg-red-500/50');
    const end = source.indexOf("'", start);
    const range = new editor.Range(documentSource.positionAt(start), documentSource.positionAt(end));
    const colors = editor.colorProviders[0]!.provideDocumentColors(documentSource);

    expect(colors).toHaveLength(1);
    expect(colors[0]!.color).toEqual(expect.objectContaining({ red: expect.any(Number), alpha: expect.any(Number) }));
    const presentations = editor.colorProviders[0]!.provideColorPresentations(
      { red: 0, green: 1, blue: 0, alpha: 0.5 },
      { document: documentSource, range },
    );
    expect(presentations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'hover:bg-[#00ff0080]',
          textEdit: expect.objectContaining({ newText: 'hover:bg-[#00ff0080]' }),
        }),
      ]),
    );
  });

  it('respects disabled color decorators', () => {
    const editor = createEditor({ colorDecorators: false });
    activate({ subscriptions: [] }, editor);
    const colors = editor.colorProviders[0]!.provideDocumentColors(document("sx('bg-red-500')"));

    expect(colors).toEqual([]);
  });
});
