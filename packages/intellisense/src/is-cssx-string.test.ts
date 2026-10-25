import { expect, it } from 'vitest';

// @ts-expect-error The editor extension ships CommonJS without declaration files.
import { cssxTokenAt, cssxTokens, isCssxString } from './is-cssx-string.js';

function createEditor(classFunctions: string[] = []) {
  return {
    Range: class Range {
      constructor(
        readonly start: unknown,
        readonly end: unknown,
      ) {}
    },
    workspace: {
      getConfiguration: () => ({
        get: (name: string, fallback: unknown) => (name === 'classFunctions' ? classFunctions : fallback),
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
    lineAt: (line: number) => ({ text: lines[line]! }),
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

it('recognizes multiline cssx.create object strings', () => {
  const text = "import * as cssx from '@cssxio/cssx';\nconst styles = cssx.create({\n  root: 'text-',\n});";
  const document = createDocument(text);
  const position = document.positionAt(text.indexOf('text-') + 'text-'.length);

  expect(isCssxString(document, position, createEditor())).toBe(true);
  expect(cssxTokenAt(document, position, createEditor())).toMatchObject({ token: 'text-' });
});

it('recognizes named and namespace import aliases', () => {
  const named = "import { create as styleMap, sx as utility } from '@cssxio/cssx';\nstyleMap({ root: 'text-sm' });";
  const namespace = "import * as cx from '@cssxio/cssx';\ncx.sx('bg-blue-500');";

  for (const text of [named, namespace]) {
    const document = createDocument(text);
    const position = document.positionAt(text.lastIndexOf("'") - 1);
    expect(isCssxString(document, position, createEditor())).toBe(true);
  }
});

it('recognizes static template portions and excludes interpolation expressions', () => {
  const text = "import { sx as utility } from '@cssxio/cssx';\nutility(`text-sm ${value} text-lg`);";
  const document = createDocument(text);
  const utilityPosition = document.positionAt(text.indexOf('text-lg') + 4);
  const expressionPosition = document.positionAt(text.indexOf('value') + 2);

  expect(isCssxString(document, utilityPosition, createEditor())).toBe(true);
  expect(isCssxString(document, expressionPosition, createEditor())).toBe(false);
  expect(cssxTokens(document, createEditor()).map(({ token }: { token: string }) => token)).toEqual([
    'text-sm',
    'text-lg',
  ]);
});

it('recognizes class attributes and configured function names', () => {
  const attribute = '<div className={"hover:text-sm"} />';
  const attributeDocument = createDocument(attribute);
  expect(
    isCssxString(attributeDocument, attributeDocument.positionAt(attribute.indexOf('text-sm') + 3), createEditor()),
  ).toBe(true);

  const configured = "ui.sxPlus('hover:flex";
  const configuredDocument = createDocument(configured);
  expect(
    isCssxString(configuredDocument, configuredDocument.positionAt(configured.length), createEditor(['ui.sxPlus'])),
  ).toBe(true);
});

it('ignores comments and unrelated strings', () => {
  const text = "// sx('text-sm')\nconst note = 'text-sm';\nconst value = 3;";
  const document = createDocument(text);

  expect(isCssxString(document, document.positionAt(text.indexOf('text-sm') + 3), createEditor())).toBe(false);
  expect(cssxTokens(document, createEditor())).toEqual([]);
});

it('supports default imports, destructured aliases, and quoted utility content', () => {
  const text = [
    "import defaultCssx, { create as makeStyles, sx as utility, sx, other as unrelated } from '@cssxio/cssx';",
    'defaultCssx.create({ root: "bg-red-500 [content:\'hello world\']" });',
    "makeStyles({ root: 'text-sm' });",
    "utility(`text-sm ${someCall('ignored')} text-lg`);",
    "unrelated('text-base');",
    '<div class="p-4" className={"text-base"} />',
    "const note = /* comment */ 'not-a-class'; // utility('text-xs')",
  ].join('\n');
  const document = createDocument(text);

  expect(cssxTokens(document, createEditor()).map(({ token }: { token: string }) => token)).toEqual([
    'bg-red-500',
    "[content:'hello world']",
    'text-sm',
    'text-sm',
    'text-lg',
    'p-4',
    'text-base',
  ]);
  expect(isCssxString(document, document.positionAt(text.indexOf('ignored') + 2), createEditor())).toBe(false);
});

it('handles escapes, nested template expressions, open strings, and token gaps', () => {
  const escaped = "utility('text-sm\\' text-lg'); utility(`bg-red-500 \\` bg-blue-500`);";
  const escapedDocument = createDocument(escaped);
  expect(cssxTokens(escapedDocument, createEditor(['utility'])).length).toBeGreaterThan(0);

  const nested = "sx(`text-sm ${( { value: 'ignored' } ).value} text-lg`); const note = `unrelated`;";
  const nestedDocument = createDocument(nested);
  expect(cssxTokens(nestedDocument, createEditor()).map(({ token }: { token: string }) => token)).toEqual([
    'text-sm',
    'text-lg',
  ]);

  const quotedToken = String.raw`utility('[content:"a\\" b"]')`;
  const quotedDocument = createDocument(quotedToken);
  expect(cssxTokens(quotedDocument, createEditor(['utility'])).map(({ token }: { token: string }) => token)).toEqual([
    '[content:"a\\" b"]',
  ]);

  const gap = "sx('text-sm  text-lg')";
  const gapDocument = createDocument(gap);
  const gapPosition = gapDocument.positionAt(gap.indexOf('  ') + 1);
  expect(cssxTokenAt(gapDocument, gapPosition, createEditor())).toMatchObject({ token: '', completeToken: '' });

  const incomplete = 'sx(`text-';
  const incompleteDocument = createDocument(incomplete);
  expect(isCssxString(incompleteDocument, incompleteDocument.positionAt(incomplete.length), createEditor())).toBe(true);

  const malformed = "sx('text-\nnot-valid');";
  const malformedDocument = createDocument(malformed);
  expect(
    isCssxString(malformedDocument, malformedDocument.positionAt(malformed.indexOf('text-') + 4), createEditor()),
  ).toBe(false);
});

it('decodes JavaScript host escapes while retaining exact source ranges', () => {
  const text = String.raw`cssx.create({ root: "content-[\"hello world\"] text-red-500" })`;
  const document = createDocument(text);
  const tokens = cssxTokens(document, createEditor());
  const secondToken = tokens[1]!;
  const cursor = document.positionAt(text.indexOf('text-red-500') + 'text-red-500'.length);

  expect(tokens.map(({ token }: { token: string }) => token)).toEqual(['content-["hello world"]', 'text-red-500']);
  expect(text.slice(secondToken.start, secondToken.end)).toBe('text-red-500');
  expect(cssxTokenAt(document, cursor, createEditor())).toMatchObject({
    token: 'text-red-500',
    completeToken: 'text-red-500',
    rawToken: 'text-red-500',
    start: text.indexOf('text-red-500'),
    end: text.indexOf('text-red-500') + 'text-red-500'.length,
  });
});

it('retains unfinished bracket, quote, and parenthesis candidates', () => {
  for (const candidate of ['w-[calc(100vw - 2rem', 'content-["hello world', 'animation-duration-(--duration, 1s']) {
    const text = `sx('${candidate}`;
    const document = createDocument(text);
    const current = cssxTokenAt(document, document.positionAt(text.length), createEditor());
    expect(current).toMatchObject({ token: candidate, completeToken: candidate, rawToken: candidate });
    expect(text.slice(current!.start, current!.end)).toBe(candidate);
  }
});

it('uses source offsets for unicode, legacy underscores, and explicit CSSX backslash escapes', () => {
  const text = String.raw`sx("content-[\u0022é😀 world\u0022] w-[foo_bar] w-[foo\\_bar]")`;
  const document = createDocument(text);
  const tokens = cssxTokens(document, createEditor());

  expect(tokens.map(({ token }: { token: string }) => token)).toEqual([
    'content-["é😀 world"]',
    'w-[foo_bar]',
    'w-[foo\\_bar]',
  ]);
  expect(text.slice(tokens[0]!.start, tokens[0]!.end)).toBe(String.raw`content-[\u0022é😀 world\u0022]`);
  expect(text.slice(tokens[1]!.start, tokens[1]!.end)).toBe('w-[foo_bar]');
  expect(text.slice(tokens[2]!.start, tokens[2]!.end)).toBe(String.raw`w-[foo\\_bar]`);
});

it('keeps direct class attributes literal and decodes class expression strings', () => {
  const text = String.raw`<div class="content-[\"hello world\"]" className={"text-\u0073m"} />`;
  const document = createDocument(text);

  expect(cssxTokens(document, createEditor()).map(({ token }: { token: string }) => token)).toEqual([
    String.raw`content-[\"hello world\"]`,
    'text-sm',
  ]);
});

it('decodes JavaScript escape forms and handles line continuations', () => {
  const escaped = String.raw`sx('a\nb\x41\u0042\u{1f600}\z\0\07')`;
  const escapedDocument = createDocument(escaped);
  expect(cssxTokens(escapedDocument, createEditor()).map(({ token }: { token: string }) => token)).toEqual([
    'a',
    'bAB😀z\u000007',
  ]);

  const lineFeed = "sx('text-\\\nsm')";
  const lineFeedDocument = createDocument(lineFeed);
  expect(cssxTokens(lineFeedDocument, createEditor()).map(({ token }: { token: string }) => token)).toEqual([
    'text-sm',
  ]);
  expect(
    cssxTokens(lineFeedDocument, createEditor()).map(({ start, end }: { start: number; end: number }) =>
      lineFeed.slice(start, end),
    ),
  ).toEqual(['text-\\\nsm']);

  const crlf = "sx('text-\\\r\nsm')";
  expect(cssxTokens(createDocument(crlf), createEditor()).map(({ token }: { token: string }) => token)).toEqual([
    'text-sm',
  ]);
  const standaloneCarriageReturn = "sx('text-\\\rsm')";
  expect(
    cssxTokens(createDocument(standaloneCarriageReturn), createEditor()).map(({ token }: { token: string }) => token),
  ).toEqual(['text-sm']);

  const templateCrlf = 'sx(`text-\\\r\nsm`)';
  expect(cssxTokens(createDocument(templateCrlf), createEditor()).map(({ token }: { token: string }) => token)).toEqual(
    ['text-sm'],
  );

  const invalidEscapes = String.raw`sx('a\x4z\u{110000}\u12')`;
  expect(
    cssxTokens(createDocument(invalidEscapes), createEditor()).map(({ token }: { token: string }) => token),
  ).toEqual(['ax4zu{110000}u12']);

  const danglingNullEscape = String.raw`sx('x\0`;
  expect(
    cssxTokens(createDocument(danglingNullEscape), createEditor()).map(({ token }: { token: string }) => token),
  ).toEqual(['x\u0000']);

  expect(
    cssxTokens(createDocument("sx('a\\\\b')"), createEditor()).map(({ token }: { token: string }) => token),
  ).toEqual(['a\\b']);
});

it('preserves a dangling source backslash in an unfinished string', () => {
  const text = "sx('text-" + '\\';
  const document = createDocument(text);
  expect(cssxTokenAt(document, document.positionAt(text.length), createEditor())).toMatchObject({
    token: 'text-\\',
    completeToken: 'text-\\',
  });
});
