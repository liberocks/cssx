import type { CompiledStyle } from '@cssxio/compiler';
import { createClassNameAllocator } from '@cssxio/compiler';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { transformNativeStaticCreateModule } from './native-static-create';
import type { NativeCssxCall } from './native-static-sx';

const { compileStyleRecords } = vi.hoisted(() => ({ compileStyleRecords: vi.fn() }));

vi.mock('@cssxio/compiler', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@cssxio/compiler')>()),
  compileStyleRecords,
}));

const source =
  "import { create, props } from '@cssxio/cssx'; const styles = create({ root: 'p-4' }); export const value = props(styles.root);";
const createStart = source.indexOf('create(');
const propsStart = source.indexOf('props(');
const calls: NativeCssxCall[] = [
  {
    entryPoint: 'create',
    start: createStart,
    end: source.indexOf(');', createStart) + 1,
    startUtf16: createStart,
    endUtf16: source.indexOf(');', createStart) + 1,
    line: 1,
    column: 0,
    staticSx: false,
    staticCreate: true,
    staticProps: false,
    fastTransformSafe: true,
    utilities: [],
    styles: [{ name: 'root', utilities: 'p-4' }],
    styleNames: [],
  },
  {
    entryPoint: 'props',
    start: propsStart,
    end: source.indexOf(');', propsStart) + 1,
    startUtf16: propsStart,
    endUtf16: source.indexOf(');', propsStart) + 1,
    line: 1,
    column: 0,
    staticSx: false,
    staticCreate: false,
    staticProps: true,
    fastTransformSafe: true,
    utilities: [],
    styles: [],
    styleNames: ['root'],
  },
];
const compositionCalls: NativeCssxCall[] = [
  {
    ...calls[0]!,
    styles: [
      { name: 'root', utilities: 'p-4' },
      { name: 'accent', utilities: 'bg-red-500' },
    ],
  },
  { ...calls[1]!, styleNames: ['root', 'accent'] },
];
const style: CompiledStyle = { $$css: 2, c: 'atom', _: [] };

function transform(analyzedCalls: readonly NativeCssxCall[] = calls) {
  return transformNativeStaticCreateModule(
    source,
    '/project/page.tsx',
    '/project',
    { mode: 'production', sourceMap: false },
    createClassNameAllocator(),
    { findCssxCalls: () => [...analyzedCalls] },
  );
}

describe('native static create compiler boundaries', () => {
  beforeEach(() => compileStyleRecords.mockReset());

  it('falls back when the native analyzer rejects source syntax', async () => {
    const result = await transformNativeStaticCreateModule(
      source,
      '/project/page.tsx',
      '/project',
      { mode: 'production', sourceMap: false },
      createClassNameAllocator(),
      {
        findCssxCalls: () => {
          throw new Error('parse failed');
        },
      },
    );

    expect(result).toBeNull();
  });

  it('reports a missing compiled style', async () => {
    compileStyleRecords.mockReturnValue({
      candidates: { root: [] },
      styles: { root: style },
      classes: {},
      composites: {},
    });
    await expect(transform(compositionCalls)).rejects.toThrow('could not find compiled style "accent"');
  });

  it('reports a missing generated class name', async () => {
    compileStyleRecords.mockReturnValue({
      candidates: { root: ['p-4'], accent: [] },
      styles: { root: style, accent: style },
      classes: {},
      composites: {},
    });
    await expect(transform(compositionCalls)).rejects.toThrow('could not find a class name for "p-4"');
  });

  it('reports a missing style during static composition', async () => {
    let reads = 0;
    const styles = new Proxy({}, { get: () => (reads++ < 2 ? style : undefined) });
    compileStyleRecords.mockReturnValue({
      candidates: { root: [], accent: [] },
      styles,
      classes: {},
      composites: {},
    });
    await expect(transform(compositionCalls)).rejects.toThrow('could not find compiled style "root"');
  });

  it('tracks styles compiled directly to atomic classes', async () => {
    const atomicCalls: NativeCssxCall[] = [
      { ...calls[0]!, styles: [{ name: 'root', utilities: 'p-4 p-2' }] },
      calls[1]!,
    ];
    compileStyleRecords.mockReturnValue({
      candidates: { root: ['p-4', 'p-2'] },
      styles: { root: style },
      classes: { 'p-4': 'atom', 'p-2': 'atom' },
      composites: {},
    });
    const result = await transform(atomicCalls);
    expect(result?.atomicClasses).toEqual(['atom']);
  });
});
