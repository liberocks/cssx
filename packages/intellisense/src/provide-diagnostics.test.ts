import { expect, it } from 'vitest';

// @ts-expect-error The editor extension ships CommonJS without declaration files.
import { provideDiagnostics } from './provide-diagnostics.js';

function createEditor() {
  return {
    DiagnosticSeverity: { Warning: 2 },
    Diagnostic: class Diagnostic {
      source?: string;

      constructor(
        readonly range: unknown,
        readonly message: string,
        readonly severity: number,
      ) {}
    },
    Range: class Range {
      constructor(
        readonly start: unknown,
        readonly end: unknown,
      ) {}
    },
    workspace: { getConfiguration: () => ({ get: (_name: string, fallback: unknown) => fallback }) },
  };
}

function createDocument(text: string) {
  return {
    getText: () => text,
    positionAt: (offset: number) => ({ line: 0, character: offset }),
  };
}

it('warns on unknown sx utilities and leaves known and arbitrary utilities alone', () => {
  const source = "import { sx } from '@cssxio/cssx'; sx('p-4 text-copy-body w-[calc(100%-1rem)]');";
  const editor = createEditor();
  const diagnostics = provideDiagnostics(editor, createDocument(source));

  expect(diagnostics).toHaveLength(1);
  expect(diagnostics[0]).toMatchObject({
    message: expect.stringContaining('text-copy-body'),
    severity: editor.DiagnosticSeverity.Warning,
    source: 'CSSX',
  });
});

it('does not warn on create maps or ordinary class attributes', () => {
  const source = [
    "import { create } from '@cssxio/cssx';",
    "create({ root: 'external-class' });",
    '<div className={"external-class"} />',
  ].join('\n');

  expect(provideDiagnostics(createEditor(), createDocument(source))).toEqual([]);
});
