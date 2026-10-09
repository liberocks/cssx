import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it, vi } from 'vitest';

import { configureCompilationAsset } from './configure-compilation-asset';
import type { CompilationLike, NativeCompiler } from './native-types';
import type { CssxSourceModule } from './stylesheet-types';

const moduleData: CssxSourceModule = {
  id: '/project/card.tsx',
  candidates: { 'p-4': 's0x' },
  atomicClasses: ['s0x'],
  origins: { 'p-4': { line: 2, column: 4 } },
};

it('prints a naming and selector summary when debug is enabled', async () => {
  const harness = createCompilerHarness();
  const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
  try {
    configureCompilationAsset(
      harness.compiler,
      'cssx.css',
      async () => undefined,
      undefined,
      false,
      'cssx',
      undefined,
      undefined,
      false,
      async () => [moduleData],
      { debug: true },
    );
    await harness.emit();

    expect(info).toHaveBeenCalledWith(expect.stringContaining('serial naming'));
    expect(info).toHaveBeenCalledWith(expect.stringContaining('1/1 generated classes have selectors'));
    expect(harness.assets).toHaveLength(1);
  } finally {
    info.mockRestore();
  }
});

it('writes the structured diagnostic report when debug has a report path', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-debug-asset-'));
  const harness = createCompilerHarness(root);
  try {
    configureCompilationAsset(
      harness.compiler,
      'cssx.css',
      async () => undefined,
      undefined,
      false,
      'cssx',
      undefined,
      undefined,
      false,
      async () => [moduleData],
      { debug: { reportFile: 'reports/cssx.json' } },
    );
    await harness.emit();

    const report = JSON.parse(await readFile(join(root, 'reports/cssx.json'), 'utf8')) as {
      readonly classes: readonly { readonly utilities: readonly string[]; readonly selectorFound: boolean }[];
    };
    expect(report.classes).toContainEqual({
      className: 's0x',
      module: '/project/card.tsx',
      utilities: ['p-4'],
      line: 3,
      column: 5,
      selectorFound: true,
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

it('includes allocation conflicts in the debug summary', async () => {
  const harness = createCompilerHarness();
  const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
  try {
    configureCompilationAsset(
      harness.compiler,
      'cssx.css',
      async () => undefined,
      undefined,
      false,
      'cssx',
      undefined,
      undefined,
      false,
      async () => [
        moduleData,
        { ...moduleData, id: '/project/other.tsx', candidates: { 'p-4': 's1x' }, atomicClasses: ['s1x'] },
      ],
      { debug: true },
    );
    await harness.emit();

    expect(info).toHaveBeenCalledWith(expect.stringContaining('(1 utility conflicts)'));
  } finally {
    info.mockRestore();
  }
});

function createCompilerHarness(root = '/project') {
  let processAssets: (() => Promise<void>) | undefined;
  const assets: Array<{ readonly fileName: string; readonly source: unknown }> = [];
  const compilation: CompilationLike = {
    modules: [],
    hooks: {
      processAssets: {
        tapPromise(_options, handler) {
          processAssets = handler;
        },
      },
    },
    emitAsset(fileName, source) {
      assets.push({ fileName, source });
    },
  };
  const compiler = {
    context: root,
    webpack: {
      Compilation: { PROCESS_ASSETS_STAGE_ADDITIONS: 0 },
      sources: {
        RawSource: class RawSource {
          constructor(readonly source: string) {}
        },
      },
    },
    hooks: {
      thisCompilation: {
        tap(_name: string, handler: (value: CompilationLike) => void) {
          handler(compilation);
        },
      },
    },
  } as unknown as NativeCompiler;
  return {
    compiler,
    assets,
    emit: async () => processAssets?.(),
  };
}
