import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it, vi } from 'vitest';

import { developmentPluginOptions } from '../core/options';
import type { CssxSourceModule } from '../native/stylesheet';
import { getCachedProjectScanSourceModules, scanProjectCssxSourceModules } from '../transforms/project-scan';
import { startDevelopmentCoordinator, writeNextDevelopmentStylesheet } from './development-coordinator';
import { startNextDevelopmentServer, stopNextDevelopmentServer } from './next-development-server';

const fsMocks = vi.hoisted(() => ({ failRename: false, failUnlink: false }));
const scanMocks = vi.hoisted(() => ({
  failure: undefined as unknown,
  onUpdate: undefined as ((modules: readonly CssxSourceModule[]) => Promise<void>) | undefined,
  stopWatcher: vi.fn(),
}));

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return {
    ...actual,
    rename: (...args: Parameters<typeof actual.rename>) =>
      fsMocks.failRename ? Promise.reject(new Error('atomic replace failed')) : actual.rename(...args),
    unlink: (...args: Parameters<typeof actual.unlink>) =>
      fsMocks.failUnlink ? Promise.reject(new Error('temporary file cleanup failed')) : actual.unlink(...args),
  };
});

vi.mock('../transforms/project-scan', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../transforms/project-scan')>();
  return {
    ...actual,
    scanProjectCssxSourceModules: (...args: Parameters<typeof actual.scanProjectCssxSourceModules>) =>
      scanMocks.failure === undefined
        ? actual.scanProjectCssxSourceModules(...args)
        : Promise.reject(scanMocks.failure),
    watchProjectCssxSourceModules: async (...args: Parameters<typeof actual.watchProjectCssxSourceModules>) => {
      scanMocks.onUpdate = args[2] as (modules: readonly CssxSourceModule[]) => Promise<void>;
      return scanMocks.stopWatcher;
    },
  };
});

const notifySourceUpdate = (modules: readonly CssxSourceModule[]) =>
  (scanMocks.onUpdate as unknown as (modules: readonly CssxSourceModule[]) => Promise<void>)(modules);

it('writes a cached Next stylesheet atomically while preserving the last successful output', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-next-coordinator-'));
  const sourceFile = join(root, 'app', 'page.tsx');
  const styleSheetFile = join(root, '.cssx', 'next.css');
  const options = developmentPluginOptions({ sourceMap: true, preflight: false });
  const connection = startNextDevelopmentServer(root, styleSheetFile);
  let stop: (() => void) | undefined;
  scanMocks.onUpdate = undefined;
  scanMocks.stopWatcher.mockClear();

  try {
    await mkdir(join(root, 'app'), { recursive: true });
    await writeFile(sourceFile, `import { sx } from '@cssxio/cssx'; export const className = sx('p-4');`);
    const startup = startDevelopmentCoordinator(root, styleSheetFile, options, connection);
    expect(startDevelopmentCoordinator(root, styleSheetFile, options, connection)).toBe(startup);
    stop = await startup;

    const initialStylesheet = await readFile(styleSheetFile, 'utf8');
    expect(initialStylesheet).toContain('padding:calc(0.25rem * 4)');
    expect(initialStylesheet).toContain('sourceMappingURL=generated.css.map');
    await expect(readFile(`${styleSheetFile}.map`, 'utf8')).resolves.toContain('"file":"generated.css"');
    await writeNextDevelopmentStylesheet(
      root,
      styleSheetFile,
      options,
      await scanProjectCssxSourceModules(root, options),
    );
    const readPushedStylesheet = async () => {
      const response = await fetch(`http://127.0.0.1:${connection.port}/${connection.token}/stylesheet`);
      return response.text();
    };
    await writeFile(sourceFile, `import { sx } from '@cssxio/cssx'; export const className = sx('p-8');`);
    await notifySourceUpdate(await scanProjectCssxSourceModules(root, options));
    await waitFor(async () => (await readPushedStylesheet()).includes('padding:calc(0.25rem * 8)'));
    const lastSuccessfulStylesheet = await readPushedStylesheet();

    await writeFile(
      sourceFile,
      `import { sx } from '@cssxio/cssx'; export const className = sx('p-8');\n// unchanged CSS`,
    );
    await notifySourceUpdate(await scanProjectCssxSourceModules(root, options));
    await expect(readPushedStylesheet()).resolves.toBe(lastSuccessfulStylesheet);

    await writeFile(sourceFile, `import { sx } from '@cssxio/cssx'; export const className = (`);
    await expect(scanProjectCssxSourceModules(root, options)).rejects.toThrow();
    await expect(readPushedStylesheet()).resolves.toBe(lastSuccessfulStylesheet);

    await writeFile(sourceFile, `import { sx } from '@cssxio/cssx'; export const className = sx('p-12');`);
    await notifySourceUpdate(await scanProjectCssxSourceModules(root, options));
    await waitFor(async () => (await readPushedStylesheet()).includes('padding:calc(0.25rem * 12)'));

    fsMocks.failRename = true;
    fsMocks.failUnlink = true;
    const latestStylesheet = await readPushedStylesheet();
    await writeFile(sourceFile, `import { sx } from '@cssxio/cssx'; export const className = sx('p-16');`);
    await expect(
      writeNextDevelopmentStylesheet(root, styleSheetFile, options, await scanProjectCssxSourceModules(root, options)),
    ).rejects.toThrow('atomic replace failed');
    await expect(readPushedStylesheet()).resolves.toBe(latestStylesheet);
    fsMocks.failRename = false;
    fsMocks.failUnlink = false;
    await writeFile(sourceFile, `import { sx } from '@cssxio/cssx'; export const className = sx('p-20');`);
    await notifySourceUpdate(await scanProjectCssxSourceModules(root, options));
    await waitFor(async () => (await readPushedStylesheet()).includes('padding:calc(0.25rem * 20)'));
  } finally {
    stop?.();
    stop?.();
    expect(getCachedProjectScanSourceModules(root, options)).toBeUndefined();
    expect(scanMocks.stopWatcher).toHaveBeenCalledOnce();
    stopNextDevelopmentServer(root);
    fsMocks.failRename = false;
    fsMocks.failUnlink = false;
    scanMocks.onUpdate = undefined;
    await rm(root, { recursive: true, force: true });
  }
});

it('writes development styles without a source map when source maps are disabled', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-next-coordinator-no-map-'));
  const sourceFile = join(root, 'app', 'page.tsx');
  const styleSheetFile = join(root, '.cssx', 'next.css');
  const options = developmentPluginOptions({ sourceMap: false, preflight: false });
  const connection = startNextDevelopmentServer(root, styleSheetFile);
  let stop: (() => void) | undefined;
  try {
    await mkdir(join(root, 'app'), { recursive: true });
    await writeFile(sourceFile, "import { sx } from '@cssxio/cssx'; export const className = sx('p-4');");
    stop = await startDevelopmentCoordinator(root, styleSheetFile, options, connection);

    await expect(readFile(styleSheetFile, 'utf8')).resolves.toContain('padding:calc(0.25rem * 4)');
    await expect(readFile(`${styleSheetFile}.map`, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
  } finally {
    stop?.();
    stopNextDevelopmentServer(root);
    await rm(root, { recursive: true, force: true });
  }
});

it('reports non-Error coordinator startup failures', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-next-coordinator-value-error-'));
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  scanMocks.failure = 'scan rejected with a string';
  try {
    await expect(
      startDevelopmentCoordinator(root, join(root, 'next.css'), developmentPluginOptions({}), {
        port: 45685,
        token: 'string-error',
      }),
    ).rejects.toBe('scan rejected with a string');
    await vi.waitFor(() =>
      expect(warning).toHaveBeenCalledWith(expect.stringContaining('scan rejected with a string')),
    );
  } finally {
    scanMocks.failure = undefined;
    warning.mockRestore();
    await rm(root, { recursive: true, force: true });
  }
});

it('stops directory watchers and releases cached metadata when startup output fails', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-next-coordinator-startup-error-'));
  const styleSheetFile = join(root, '.cssx', 'next.css');
  const options = developmentPluginOptions({ sourceMap: false, preflight: false });
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  try {
    await mkdir(join(root, 'app'), { recursive: true });
    await writeFile(
      join(root, 'app', 'page.tsx'),
      "import { sx } from '@cssxio/cssx'; export const className = sx('p-4');",
    );
    await mkdir(styleSheetFile, { recursive: true });
    await expect(
      startDevelopmentCoordinator(root, styleSheetFile, options, { port: 45683, token: 'startup-error' }),
    ).rejects.toMatchObject({ code: 'EISDIR' });
    await vi.waitFor(() => expect(warning).toHaveBeenCalledWith(expect.stringContaining('could not start')));
    expect(getCachedProjectScanSourceModules(root, options)).toBeUndefined();
  } finally {
    warning.mockRestore();
    await rm(root, { recursive: true, force: true });
  }
});

/** Waits for an asynchronously compiled development stylesheet. */
async function waitFor(condition: () => unknown | Promise<unknown>): Promise<void> {
  const deadline = Date.now() + 2_000;
  while (!(await condition())) {
    if (Date.now() >= deadline) {
      throw new Error('Timed out waiting for Next development coordinator update.');
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}
