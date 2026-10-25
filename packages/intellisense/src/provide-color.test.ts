import { describe, expect, it } from 'vitest';

// @ts-expect-error The editor extension ships CommonJS without declaration files.
import { CATALOG } from './catalog-entries.js';
// @ts-expect-error The editor extension ships CommonJS without declaration files.
import { provideColorPresentations, provideDocumentColors } from './provide-color.js';

function createEditor(colorDecorators = true) {
  class Range {
    constructor(
      readonly start: { line: number; character: number },
      readonly end: { line: number; character: number },
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
  return {
    Color,
    ColorInformation,
    ColorPresentation,
    Range,
    TextEdit: { replace: (range: unknown, newText: string) => ({ range, newText }) },
    workspace: {
      getConfiguration: () => ({
        get: (name: string, fallback: unknown) => (name === 'colorDecorators' ? colorDecorators : fallback),
      }),
    },
  };
}

function createDocument(source: string) {
  const offsetAt = (position: { line: number; character: number }) =>
    position.line === 0 ? position.character : source.indexOf('\n') + 1 + position.character;
  const positionAt = (offset: number) => {
    const newline = source.indexOf('\n');
    return offset <= newline || newline === -1
      ? { line: 0, character: offset }
      : { line: 1, character: offset - newline - 1 };
  };
  return {
    getText(range?: { start: { line: number; character: number }; end: { line: number; character: number } }) {
      return range ? source.slice(offsetAt(range.start), offsetAt(range.end)) : source;
    },
    offsetAt,
    positionAt,
  };
}

describe('CSSX color providers', () => {
  it('returns palette swatches only for color utility tokens', () => {
    const editor = createEditor();
    const colors = provideDocumentColors(editor, createDocument("sx('bg-red-500 text-sm')"));

    expect(colors).toHaveLength(1);
    expect(colors[0]!.color).toEqual(expect.objectContaining({ red: expect.any(Number), alpha: 1 }));
  });

  it('ignores malformed palette data when converting a document color', () => {
    const editor = createEditor();
    CATALOG.colors['invalid-test-color'] = 'not-hex';
    try {
      expect(provideDocumentColors(editor, createDocument("sx('bg-invalid-test-color')"))).toEqual([]);
    } finally {
      delete CATALOG.colors['invalid-test-color'];
    }
  });

  it('edits a picked color while preserving the utility family and alpha', () => {
    const editor = createEditor();
    const source = "sx('hover:bg-red-500')";
    const document = createDocument(source);
    const start = source.indexOf('hover:bg-red-500');
    const end = start + 'hover:bg-red-500'.length;
    const context = {
      document,
      range: new editor.Range(document.positionAt(start), document.positionAt(end)),
    };

    expect(provideColorPresentations(editor, { red: 0, green: 1, blue: 0, alpha: 1 }, context)[0]).toEqual(
      expect.objectContaining({
        label: 'hover:bg-[#00ff00]',
        textEdit: expect.objectContaining({ newText: 'hover:bg-[#00ff00]' }),
      }),
    );
    expect(provideColorPresentations(editor, { red: 0, green: 1, blue: 0, alpha: 0.5 }, context)[0]?.label).toBe(
      'hover:bg-[#00ff0080]',
    );
  });

  it('uses decoded candidates and preserves escaped selector source in color edits', () => {
    const editor = createEditor();
    const source = String.raw`sx("[&[data-label=\"[\"] h1]:bg-red-500")`;
    const document = createDocument(source);
    const color = provideDocumentColors(editor, document)[0]!;
    const presentations = provideColorPresentations(
      editor,
      { red: 0, green: 1, blue: 0, alpha: 1 },
      {
        document,
        range: color.range,
      },
    );

    expect(presentations[0]).toEqual(
      expect.objectContaining({
        label: String.raw`[&[data-label=\"[\"] h1]:bg-[#00ff00]`,
        textEdit: expect.objectContaining({ newText: String.raw`[&[data-label=\"[\"] h1]:bg-[#00ff00]` }),
      }),
    );
    const sourceStart = document.offsetAt(color.range.start);
    const sourceEnd = document.offsetAt(color.range.end);
    const textEdit = presentations[0]!.textEdit as { newText: string };
    expect(source.slice(0, sourceStart) + textEdit.newText + source.slice(sourceEnd)).toBe(
      String.raw`sx("[&[data-label=\"[\"] h1]:bg-[#00ff00]")`,
    );
  });

  it('keeps color presentation support when the source range has no CSSX token mapping', () => {
    const editor = createEditor();
    const source = 'bg-red-500';
    const document = createDocument(source);
    const context = {
      document,
      range: new editor.Range(document.positionAt(0), document.positionAt(source.length)),
    };

    expect(provideColorPresentations(editor, { red: 0, green: 1, blue: 0, alpha: 1 }, context)[0]).toEqual(
      expect.objectContaining({
        label: 'bg-[#00ff00]',
        textEdit: expect.objectContaining({ newText: 'bg-[#00ff00]' }),
      }),
    );
  });

  it('returns no colors or edits when disabled or given a non-color candidate', () => {
    const disabledEditor = createEditor(false);
    const source = "sx('text-sm')";
    const document = createDocument(source);
    const start = source.indexOf('text-sm');
    const context = {
      document,
      range: new disabledEditor.Range(document.positionAt(start), document.positionAt(start + 'text-sm'.length)),
    };
    const color = { red: 1, green: 0, blue: 0, alpha: 1 };

    expect(provideDocumentColors(disabledEditor, document)).toEqual([]);
    expect(provideColorPresentations(disabledEditor, color, context)).toEqual([]);
    expect(provideColorPresentations(createEditor(), color, context)).toEqual([]);
  });
});
