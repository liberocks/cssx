import { expect, it } from 'vitest';

import { compileDeclarations } from './compile-declarations';
import { parseTheme } from './theme';

const theme = parseTheme();

it('resolves font-size utilities first', () => {
  expect(compileDeclarations('text-lg', false, theme)).toEqual([
    { property: 'font-size', value: '1.125rem' },
    { property: 'line-height', value: 'calc(1.75 / 1.125)' },
  ]);
});

it('clones exact declarations for named utilities', () => {
  expect(compileDeclarations('hidden', false, theme)).toEqual([{ property: 'display', value: 'none' }]);
});

it('compiles arbitrary properties', () => {
  expect(compileDeclarations('[color:red]', false, theme)).toEqual([{ property: 'color', value: 'red' }]);
});

it('routes spacing, divide, placeholder, outline, and container families', () => {
  expect(compileDeclarations('p-2', false, theme)).toEqual([{ property: 'padding', value: 'calc(0.25rem * 2)' }]);
  expect(compileDeclarations('divide-x-2', false, theme)).toContainEqual(
    expect.objectContaining({
      property: 'border-left-width',
      selectorSuffix: ' > :not(:last-child)',
    }),
  );
  expect(compileDeclarations('placeholder-red-500', false, theme)).toContainEqual(
    expect.objectContaining({
      property: 'color',
      selectorSuffix: '::placeholder',
    }),
  );
  expect(compileDeclarations('outline-2', false, theme)).toEqual([{ property: 'outline-width', value: '2px' }]);
  expect(compileDeclarations('container', false, theme)).toContainEqual(
    expect.objectContaining({
      property: 'width',
      value: '100%',
    }),
  );
});

it('normalizes single and array layout declarations', () => {
  expect(compileDeclarations('overflow-x-scroll', false, theme)).toEqual([{ property: 'overflow-x', value: 'scroll' }]);
  expect(compileDeclarations('scroll-px-2', false, theme)).toEqual([
    { property: 'scroll-padding-left', value: 'calc(0.25rem * 2)' },
    { property: 'scroll-padding-right', value: 'calc(0.25rem * 2)' },
  ]);
});

it('normalizes single and array prefixed declarations', () => {
  expect(compileDeclarations('opacity-50', false, theme)).toEqual([{ property: 'opacity', value: '0.5' }]);
  expect(compileDeclarations('line-clamp-2', false, theme)).toEqual([
    { property: 'overflow', value: 'hidden', semanticGroup: 'line-clamp' },
    { property: 'display', value: '-webkit-box', semanticGroup: 'line-clamp' },
    { property: '-webkit-box-orient', value: 'vertical', semanticGroup: 'line-clamp' },
    { property: '-webkit-line-clamp', value: '2', semanticGroup: 'line-clamp' },
  ]);
});

it('rejects unsupported utilities with the raw candidate name', () => {
  expect(() => compileDeclarations('definitely-not-a-utility', false, theme)).toThrow(
    'CSSX cannot compile utility "definitely-not-a-utility".',
  );
  expect(() => compileDeclarations('definitely-not-a-utility', true, theme)).toThrow(
    'CSSX cannot compile utility "-definitely-not-a-utility".',
  );
});
