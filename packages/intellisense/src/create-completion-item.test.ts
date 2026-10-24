import { expect, it } from 'vitest';

// @ts-expect-error The editor extension ships CommonJS without declaration files.
import { createCompletionItem } from './create-completion-item.js';

it('creates a populated utility completion item and preserves its variant prefix', () => {
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
  const editor = {
    CompletionItem,
    CompletionItemKind: { Keyword: 'keyword', Value: 'value' },
    MarkdownString,
  };
  const range = { start: 1, end: 7 };

  expect(createCompletionItem(editor, range, 'hover:', { label: 'flex', detail: 'CSSX utility' })).toEqual(
    expect.objectContaining({
      label: 'hover:flex',
      kind: 'value',
      insertText: 'hover:flex',
      range,
      detail: 'CSSX utility',
      documentation: expect.objectContaining({ value: '**flex** — CSSX utility.' }),
    }),
  );
});

it('uses catalog details when the entry is a variant keyword', () => {
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
  const editor = {
    CompletionItem,
    CompletionItemKind: { Keyword: 'keyword', Value: 'value' },
    MarkdownString,
  };

  expect(createCompletionItem(editor, {}, '', { label: 'sm:', detail: 'CSSX variant' })).toEqual(
    expect.objectContaining({
      label: 'sm:',
      kind: 'keyword',
      documentation: expect.objectContaining({ value: 'CSSX variant' }),
    }),
  );
});

it('marks palette entries as colors and includes their swatch in documentation', () => {
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
  const editor = {
    CompletionItem,
    CompletionItemKind: { Color: 'color', Keyword: 'keyword', Value: 'value' },
    MarkdownString,
  };

  expect(
    createCompletionItem(editor, {}, 'hover:', {
      label: 'custom-palette',
      detail: 'custom color',
      colorHex: '#fb2c36',
    }),
  ).toEqual(
    expect.objectContaining({
      label: 'hover:custom-palette',
      kind: 'color',
      documentation: expect.objectContaining({ value: 'custom color — #fb2c36.' }),
    }),
  );

  expect(createCompletionItem(editor, {}, '', { label: 'custom-utility', detail: 'Custom utility' })).toEqual(
    expect.objectContaining({ documentation: expect.objectContaining({ value: 'Custom utility' }) }),
  );
});
