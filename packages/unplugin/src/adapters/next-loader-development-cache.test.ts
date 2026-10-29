import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it, vi } from 'vitest';

import cssxNextLoader, { type CssxNextLoaderOptions } from './next-loader';

const cacheMocks = vi.hoisted(() => ({
  available: false,
  scan: vi.fn(async (...args: unknown[]) => {
    void args;
    return [];
  }),
}));

vi.mock('../transforms/project-scan', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../transforms/project-scan')>();
  const compiler = await import('@cssxio/compiler');
  return {
    ...actual,
    getCachedProjectScanSourceModules: () => (cacheMocks.available ? [] : undefined),
    getProjectScanClassNameAllocator: () => compiler.createClassNameAllocator(),
    scanProjectCssxSourceModules: (...args: Parameters<typeof actual.scanProjectCssxSourceModules>) =>
      cacheMocks.scan(...args),
    updateProjectScanModule: async () => false,
  };
});

it('reconciles a missing metadata cache and skips unchanged modules when cached', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-next-loader-cache-fallback-'));
  const sourceFile = join(root, 'app', 'page.tsx');
  const plainFile = join(root, 'app', 'plain.ts');
  const styleSheetFile = join(root, '.cssx', 'next.css');
  const source = "import { sx } from '@cssxio/cssx'; export const className = sx('p-4');";
  const settings: CssxNextLoaderOptions = {
    projectRoot: root,
    styleSheetFile,
    importSource: '@cssxio/cssx',
    manifestPath: join(root, '.cssx', 'classnames.json'),
    development: true,
    cssx: { sourceMap: false, preflight: false },
  };
  cacheMocks.available = false;
  cacheMocks.scan.mockReset();
  cacheMocks.scan.mockResolvedValue([]);
  try {
    await mkdir(join(root, 'app'), { recursive: true });
    await writeFile(sourceFile, source);
    await runLoader(sourceFile, source, settings);

    const stylesheet = await readFile(styleSheetFile, 'utf8');
    expect(stylesheet).toBe('');
    expect(cacheMocks.scan).toHaveBeenCalledOnce();

    cacheMocks.available = true;
    await writeFile(plainFile, 'export const plain = true;');
    await runLoader(plainFile, 'export const plain = true;', settings);
    await expect(readFile(styleSheetFile, 'utf8')).resolves.toBe(stylesheet);
    expect(cacheMocks.scan).toHaveBeenCalledOnce();
  } finally {
    cacheMocks.available = false;
    await rm(root, { recursive: true, force: true });
  }
});

function runLoader(resourcePath: string, source: string, settings: CssxNextLoaderOptions): Promise<string> {
  return new Promise((resolvePromise, rejectPromise) => {
    cssxNextLoader.call(
      {
        resourcePath,
        async: () => (error: Error | null, code?: string) => {
          if (error) {
            rejectPromise(error);
          } else {
            resolvePromise(code ?? '');
          }
        },
        getOptions: () => settings,
        addDependency: () => undefined,
        addContextDependency: () => undefined,
      } as never,
      source,
    );
  });
}
