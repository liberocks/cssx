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

it('returns help for known utility strings', () => {
  const editor = createEditor();
  const source = "cssx.create({\n  title: 'text-sm',\n})";
  const document = createDocument(source);
  const hover = provideHover(editor, document, document.positionAt(source.indexOf('text-sm') + 4));

  expect(hover).toEqual(
    expect.objectContaining({ contents: expect.objectContaining({ value: '**text-sm** — CSSX utility.' }) }),
  );
});

it('returns no hover outside CSSX strings or for unknown utilities', () => {
  const editor = createEditor();
  const source = "const value = 'flex'";
  const document = createDocument(source);

  expect(provideHover(editor, document, document.positionAt(source.indexOf('flex') + 2))).toBeUndefined();
  const unknown = "sx('unknown";
  expect(
    provideHover(editor, createDocument(unknown), createDocument(unknown).positionAt(unknown.length)),
  ).toBeUndefined();
});

it('matches utility documentation after decoding escaped host string quotes', () => {
  const editor = createEditor();
  const source = String.raw`sx("[&[data-label=\"[\"] h1]:text-red-500")`;
  const document = createDocument(source);
  const position = document.positionAt(source.indexOf('text-red-500') + 4);

  expect(provideHover(editor, document, position)).toEqual(
    expect.objectContaining({
      contents: expect.objectContaining({ value: expect.stringContaining('**text-red-500**') }),
    }),
  );
});
