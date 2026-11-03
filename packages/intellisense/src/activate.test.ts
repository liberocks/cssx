import { expect, it, vi } from 'vitest';

// @ts-expect-error The editor extension ships CommonJS without declaration files.
import { activate } from './activate.js';

it('registers language providers and stores their disposables', () => {
  const completionDisposable = { dispose: vi.fn() };
  const hoverDisposable = { dispose: vi.fn() };
  const colorDisposable = { dispose: vi.fn() };
  const editor = {
    languages: {
      registerCompletionItemProvider: vi.fn(() => completionDisposable),
      registerHoverProvider: vi.fn(() => hoverDisposable),
      registerColorProvider: vi.fn(() => colorDisposable),
      createDiagnosticCollection: vi.fn(() => ({ dispose: vi.fn() })),
    },
  };
  const subscriptions: unknown[] = [];

  activate({ subscriptions }, editor);

  expect(editor.languages.registerCompletionItemProvider).toHaveBeenCalledWith(
    ['javascript', 'typescript', 'javascriptreact', 'typescriptreact', 'html', 'astro', 'vue', 'svelte'],
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
  expect(editor.languages.registerHoverProvider).toHaveBeenCalledWith(
    expect.arrayContaining(['vue', 'svelte']),
    expect.objectContaining({ provideHover: expect.any(Function) }),
  );
  expect(subscriptions).toHaveLength(4);
  expect(subscriptions.slice(0, 3)).toEqual([completionDisposable, hoverDisposable, colorDisposable]);
});

it('updates the diagnostic collection as documents open, change, and close', () => {
  const source = "import { sx } from '@cssxio/cssx'; sx('external-class');";
  const textDocument = {
    uri: 'file:///project/app.ts',
    getText: () => source,
    positionAt: (offset: number) => ({ line: 0, character: offset }),
  };
  type TestDocument = typeof textDocument;
  const subscriptions: unknown[] = [];
  const opened: ((value: TestDocument) => void)[] = [];
  const changed: ((event: { document: TestDocument }) => void)[] = [];
  const closed: ((value: TestDocument) => void)[] = [];
  const diagnosticCollection = { set: vi.fn(), delete: vi.fn(), dispose: vi.fn() };
  class Diagnostic {
    source?: string;

    constructor(
      readonly range: unknown,
      readonly message: string,
      readonly severity: number,
    ) {}
  }
  class Range {
    constructor(
      readonly start: unknown,
      readonly end: unknown,
    ) {}
  }
  const editor = {
    Diagnostic,
    DiagnosticSeverity: { Warning: 2 },
    Range,
    languages: {
      registerCompletionItemProvider: vi.fn(() => ({ dispose: vi.fn() })),
      registerHoverProvider: vi.fn(() => ({ dispose: vi.fn() })),
      registerColorProvider: vi.fn(() => ({ dispose: vi.fn() })),
      createDiagnosticCollection: vi.fn(() => diagnosticCollection),
    },
    workspace: {
      textDocuments: [textDocument],
      getConfiguration: () => ({ get: (_name: string, fallback: unknown) => fallback }),
      onDidOpenTextDocument: (listener: (value: TestDocument) => void) => (opened.push(listener), { dispose: vi.fn() }),
      onDidChangeTextDocument: (listener: (value: { document: TestDocument }) => void) => (
        changed.push(listener),
        { dispose: vi.fn() }
      ),
      onDidCloseTextDocument: (listener: (value: TestDocument) => void) => (
        closed.push(listener),
        { dispose: vi.fn() }
      ),
    },
  };

  activate({ subscriptions }, editor);
  opened[0]!(textDocument);
  changed[0]!({ document: textDocument });
  closed[0]!(textDocument);

  expect(diagnosticCollection.set).toHaveBeenCalledTimes(3);
  expect(diagnosticCollection.set).toHaveBeenCalledWith(textDocument.uri, [
    expect.objectContaining({ source: 'CSSX' }),
  ]);
  expect(diagnosticCollection.delete).toHaveBeenCalledWith(textDocument.uri);
  expect(subscriptions).toHaveLength(7);
});
