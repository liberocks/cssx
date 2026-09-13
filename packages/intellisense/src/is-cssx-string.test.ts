import { expect, it } from 'vitest';

// @ts-expect-error The editor extension ships CommonJS without declaration files.
import { isCssxString } from './is-cssx-string.js';

function createEditor(classFunctions: string[] = []) {
  return {
    workspace: {
      getConfiguration: () => ({
        get: (_name: string, fallback: unknown) => classFunctions ?? fallback,
      }),
    },
  };
}

function createDocument(text: string) {
  return { lineAt: () => ({ text }) };
}

it('recognizes built-in CSSX calls under the cursor', () => {
  const line = "const name = cssx.sx('hover:flex";

  expect(isCssxString(createDocument(line), { line: 0, character: line.length }, createEditor())).toBe(true);
});

it('recognizes configured function names without treating regex metacharacters as syntax', () => {
  const editor = createEditor(['ui.sx+']);
  const matchingLine = "const name = ui.sx+('flex";
  const nonMatchingLine = "const name = uiXsxx('flex";

  expect(isCssxString(createDocument(matchingLine), { line: 0, character: matchingLine.length }, editor)).toBe(true);
  expect(isCssxString(createDocument(nonMatchingLine), { line: 0, character: nonMatchingLine.length }, editor)).toBe(
    false,
  );
});

it('recognizes class and className string attributes', () => {
  const line = '<div className="flex';

  expect(isCssxString(createDocument(line), { line: 0, character: line.length }, createEditor())).toBe(true);
});

it('rejects text outside utility strings and only scans through the cursor', () => {
  const sourceLine = 'const value = Math.max(1, 2)';

  expect(isCssxString(createDocument(sourceLine), { line: 0, character: sourceLine.length }, createEditor())).toBe(
    false,
  );
  expect(isCssxString(createDocument("sx('flex"), { line: 0, character: 2 }, createEditor())).toBe(false);
});
