import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it, vi } from 'vitest';

import { installFakeMdxCompiler } from '../../test-support/install-fake-mdx';
import { canonicalPathSync } from '../core/canonical-path';
import {
  getCachedProjectScanSourceModules,
  scanProjectCssxSourceModules,
  updateProjectScanModule,
  watchProjectCssxSourceModules,
} from './project-scan';
import { transformCssxModule } from './transform';

const fsMocks = vi.hoisted(() => ({
  errorOperation: '' as '' | 'stat' | 'readFile' | 'readdir',
  errorPath: '',
  errorCode: '',
  delayReadPath: '',
  delayReadMs: 0,
  readStartedPath: '',
}));
const watchMocks = vi.hoisted(() => ({
  capture: false,
  watchers: [] as Array<{
    path: string;
    callback: (event: string, fileName: string | Buffer | null) => void;
    closed: boolean;
  }>,
}));

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    watch: ((path: string, callback: (event: string, fileName: string | Buffer | null) => void) => {
      if (!watchMocks.capture) {
        return actual.watch(path, callback);
      }
      const record = { path, callback, closed: false };
      watchMocks.watchers.push(record);
      return {
        on() {
          return this;
        },
        unref: () => undefined,
        close() {
          record.closed = true;
          return this;
        },
      } as unknown as ReturnType<typeof actual.watch>;
    }) as typeof actual.watch,
  };
});

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  const takeError = (operation: 'stat' | 'readFile' | 'readdir', path: unknown) => {
    if (fsMocks.errorOperation !== operation || String(path) !== fsMocks.errorPath) {
      return;
    }
    const code = fsMocks.errorCode;
    fsMocks.errorOperation = '';
    fsMocks.errorPath = '';
    throw Object.assign(new Error(`injected ${operation} ${code}`), { code });
  };
  return {
    ...actual,
    stat: async (...args: Parameters<typeof actual.stat>) => {
      takeError('stat', args[0]);
      return actual.stat(...args);
    },
    readFile: async (...args: Parameters<typeof actual.readFile>) => {
      takeError('readFile', args[0]);
      if (String(args[0]) === fsMocks.delayReadPath) {
        fsMocks.readStartedPath = String(args[0]);
        await new Promise((resolve) => setTimeout(resolve, fsMocks.delayReadMs));
        fsMocks.delayReadPath = '';
      }
      return actual.readFile(...args);
    },
    readdir: async (...args: Parameters<typeof actual.readdir>) => {
      takeError('readdir', args[0]);
      return actual.readdir(...args);
    },
  };
});

it('handles files disappearing between enumeration, stat, and read', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-project-scan-race-'));
  const source = join(root, 'src', 'page.tsx');
  const options = { sourceMap: false, preflight: false };
  const code = "import { sx } from '@cssxio/cssx'; export const className = sx('p-4');";
  try {
    await mkdir(join(root, 'src'), { recursive: true });
    await writeFile(source, code);
    await scanProjectCssxSourceModules(root, options);

    await writeFile(source, `${code}\n// stat race`);
    fsMocks.errorOperation = 'stat';
    fsMocks.errorPath = canonicalPathSync(source);
    fsMocks.errorCode = 'ENOENT';
    await expect(scanProjectCssxSourceModules(root, options)).resolves.toEqual([]);

    await writeFile(source, code);
    await scanProjectCssxSourceModules(root, options);
    await writeFile(source, `${code}\n// read race`);
    fsMocks.errorOperation = 'readFile';
    fsMocks.errorPath = canonicalPathSync(source);
    fsMocks.errorCode = 'ENOENT';
    await expect(scanProjectCssxSourceModules(root, options)).resolves.toEqual([]);

    await writeFile(source, code);
    await writeFile(source, `${code}\n// stat permission error`);
    fsMocks.errorOperation = 'stat';
    fsMocks.errorPath = canonicalPathSync(source);
    fsMocks.errorCode = 'EACCES';
    await expect(scanProjectCssxSourceModules(root, options)).rejects.toMatchObject({ code: 'EACCES' });

    const transformed = await transformCssxModule(code, source, options, undefined, { compileCss: false });
    fsMocks.errorOperation = 'stat';
    fsMocks.errorPath = canonicalPathSync(source);
    fsMocks.errorCode = 'EACCES';
    await expect(updateProjectScanModule(root, source, options, transformed, code)).rejects.toMatchObject({
      code: 'EACCES',
    });
    await writeFile(source, `${code}\n// update read permission error`);
    fsMocks.errorOperation = 'readFile';
    fsMocks.errorPath = canonicalPathSync(source);
    fsMocks.errorCode = 'EACCES';
    await expect(
      updateProjectScanModule(root, source, options, transformed, `${code}\n// update read permission error`),
    ).rejects.toMatchObject({
      code: 'EACCES',
    });
    await writeFile(source, `${code}\n// read permission error`);
    fsMocks.errorOperation = 'readFile';
    fsMocks.errorPath = canonicalPathSync(source);
    fsMocks.errorCode = 'EACCES';
    await expect(scanProjectCssxSourceModules(root, options)).rejects.toMatchObject({ code: 'EACCES' });
  } finally {
    fsMocks.errorOperation = '';
    fsMocks.errorPath = '';
    fsMocks.delayReadPath = '';
    fsMocks.readStartedPath = '';
    await rm(root, { recursive: true, force: true });
  }
});

it('applies watcher changes after an initial scan already in flight', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-project-scan-inflight-watcher-'));
  const source = join(root, 'src', 'page.tsx');
  const options = { sourceMap: false, preflight: false };
  const initial = "import { sx } from '@cssxio/cssx'; export const className = sx('p-4');";
  const changed = "import { sx } from '@cssxio/cssx'; export const className = sx('p-8');";
  let stop: (() => void) | undefined;
  let updates = 0;
  try {
    await mkdir(join(root, 'src'), { recursive: true });
    await writeFile(source, initial);
    fsMocks.delayReadPath = canonicalPathSync(source);
    fsMocks.delayReadMs = 60;
    const scan = scanProjectCssxSourceModules(root, options);
    await vi.waitFor(() => expect(fsMocks.readStartedPath).toBe(canonicalPathSync(source)));
    watchMocks.capture = true;
    watchMocks.watchers.length = 0;
    stop = await watchProjectCssxSourceModules(root, options, () => {
      updates++;
    });

    await writeFile(source, changed);
    watchMocks.watchers
      .find(({ path }) => path === canonicalPathSync(join(root, 'src'))!)!
      .callback('change', 'page.tsx');
    await new Promise((resolve) => setTimeout(resolve, 10));
    await scan;
    await vi.waitFor(
      () => {
        expect(getCachedProjectScanSourceModules(root, options)?.[0]?.candidates).toHaveProperty('p-8');
        expect(updates).toBe(1);
      },
      { timeout: 5_000 },
    );
  } finally {
    stop?.();
    watchMocks.capture = false;
    watchMocks.watchers.length = 0;
    fsMocks.delayReadPath = '';
    fsMocks.readStartedPath = '';
    await rm(root, { recursive: true, force: true });
  }
});

it('serializes watcher edits behind scans and handles plain and deleted files', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-project-scan-overlap-'));
  const sourceDirectory = join(root, 'src');
  const source = join(sourceDirectory, 'page.tsx');
  const plainSource = join(sourceDirectory, 'plain.tsx');
  const options = { sourceMap: false, preflight: false };
  const styleCode = (utility: string) =>
    `import { sx } from '@cssxio/cssx'; export const className = sx('${utility}');`;
  let stop: (() => void) | undefined;
  let updates = 0;
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  try {
    await mkdir(sourceDirectory, { recursive: true });
    await writeFile(source, styleCode('p-4'));
    await scanProjectCssxSourceModules(root, options);
    watchMocks.capture = true;
    watchMocks.watchers.length = 0;
    stop = await watchProjectCssxSourceModules(root, options, () => {
      updates++;
    });
    const sourceWatcher = watchMocks.watchers.find(({ path }) => path === canonicalPathSync(sourceDirectory))!;

    await writeFile(source, styleCode('p-8'));
    fsMocks.delayReadPath = canonicalPathSync(source);
    fsMocks.readStartedPath = '';
    fsMocks.delayReadMs = 350;
    const pendingScan = scanProjectCssxSourceModules(root, options);
    await vi.waitFor(() => expect(fsMocks.readStartedPath).toBe(canonicalPathSync(source)));
    sourceWatcher.callback('change', 'page.tsx');
    await pendingScan;
    await vi.waitFor(() => expect(updates).toBe(1));
    expect(getCachedProjectScanSourceModules(root, options)?.[0]?.candidates).toHaveProperty('p-8');

    await writeFile(plainSource, 'export const plain = true;');
    sourceWatcher.callback('change', 'plain.tsx');
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(updates).toBe(1);

    await writeFile(source, styleCode('p-12'));
    fsMocks.delayReadPath = canonicalPathSync(source);
    fsMocks.readStartedPath = '';
    const removalScan = scanProjectCssxSourceModules(root, options);
    await vi.waitFor(() => expect(fsMocks.readStartedPath).toBe(canonicalPathSync(source)));
    await rm(source);
    sourceWatcher.callback('change', 'page.tsx');
    await removalScan;
    await vi.waitFor(() => expect(updates).toBe(2), { interval: 10, timeout: 5_000 });
    expect(getCachedProjectScanSourceModules(root, options)).toEqual([]);

    await writeFile(source, styleCode('p-16'));
    sourceWatcher.callback('change', 'page.tsx');
    await vi.waitFor(() => expect(updates).toBe(3));
    fsMocks.errorOperation = 'stat';
    fsMocks.errorPath = canonicalPathSync(source);
    fsMocks.errorCode = 'EACCES';
    sourceWatcher.callback('change', 'page.tsx');
    await vi.waitFor(() => expect(warning).toHaveBeenCalledWith(expect.stringContaining('injected stat EACCES')));
    expect(updates).toBe(3);
  } finally {
    stop?.();
    watchMocks.capture = false;
    fsMocks.errorOperation = '';
    fsMocks.errorPath = '';
    fsMocks.delayReadPath = '';
    fsMocks.readStartedPath = '';
    warning.mockRestore();
    await rm(root, { recursive: true, force: true });
  }
});

it('does not publish a full scan that finishes after its watcher has stopped', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-project-scan-full-stop-'));
  const source = join(root, 'src', 'page.tsx');
  const options = { sourceMap: false, preflight: false };
  const initial = "import { sx } from '@cssxio/cssx'; export const className = sx('p-4');";
  const changed = "import { sx } from '@cssxio/cssx'; export const className = sx('p-8');";
  let stop: (() => void) | undefined;
  let updates = 0;
  try {
    await mkdir(join(root, 'src'), { recursive: true });
    await writeFile(source, initial);
    await scanProjectCssxSourceModules(root, options);
    watchMocks.capture = true;
    watchMocks.watchers.length = 0;
    stop = await watchProjectCssxSourceModules(root, options, () => {
      updates++;
    });

    fsMocks.delayReadPath = canonicalPathSync(source);
    fsMocks.delayReadMs = 100;
    await writeFile(source, changed);
    watchMocks.watchers.find(({ path }) => path === canonicalPathSync(root))!.callback('rename', null);
    await vi.waitFor(() => expect(fsMocks.readStartedPath).toBe(canonicalPathSync(source)));
    stop();
    stop = undefined;
    await new Promise((resolve) => setTimeout(resolve, 120));

    expect(updates).toBe(0);
    expect(getCachedProjectScanSourceModules(root, options)).toBeUndefined();
  } finally {
    stop?.();
    watchMocks.capture = false;
    fsMocks.delayReadPath = '';
    fsMocks.readStartedPath = '';
    await rm(root, { recursive: true, force: true });
  }
});

it('removes MDX modules when their CSSX import is deleted', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-project-scan-mdx-removal-'));
  const source = join(root, 'content.mdx');
  const options = { naming: 'source' as const, stableClassNames: true, sourceMap: false, preflight: false };
  const mdxSource = "import { sx } from '@cssxio/cssx'; export const className = sx('p-4');";
  let stop: (() => void) | undefined;
  let updates = 0;
  try {
    await installFakeMdxCompiler(root);
    await writeFile(source, mdxSource);
    await expect(scanProjectCssxSourceModules(root, options)).resolves.toHaveLength(1);
    stop = await watchProjectCssxSourceModules(root, options, () => {
      updates++;
    });

    const changedMdxSource = mdxSource.replace("sx('p-4')", "sx('p-8')");
    await writeFile(source, changedMdxSource);
    await vi.waitFor(() => {
      expect(getCachedProjectScanSourceModules(root, options)?.[0]?.candidates).toHaveProperty('p-8');
      expect(updates).toBe(1);
    });

    await writeFile(source, '# Plain markdown');
    await vi.waitFor(
      () => {
        expect(getCachedProjectScanSourceModules(root, options)).toEqual([]);
        expect(updates).toBe(2);
      },
      { timeout: 5_000 },
    );
  } finally {
    stop?.();
    await rm(root, { recursive: true, force: true });
  }
});

it('reports non-missing directory enumeration errors while starting a watcher', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-project-scan-readdir-error-'));
  const options = { sourceMap: false, preflight: false };
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  let stop: (() => void) | undefined;
  try {
    await scanProjectCssxSourceModules(root, options);
    fsMocks.errorOperation = 'readdir';
    fsMocks.errorPath = canonicalPathSync(root);
    fsMocks.errorCode = 'EACCES';
    stop = await watchProjectCssxSourceModules(root, options, () => undefined);
    await vi.waitFor(() => expect(warning).toHaveBeenCalledWith(expect.stringContaining('EACCES')));
  } finally {
    stop?.();
    fsMocks.errorOperation = '';
    fsMocks.errorPath = '';
    warning.mockRestore();
    await rm(root, { recursive: true, force: true });
  }
});

it('deduplicates in-flight scans and module updates without dropping final metadata', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-project-scan-inflight-'));
  const source = join(root, 'page.tsx');
  const options = { sourceMap: false, preflight: false };
  const code = "import { sx } from '@cssxio/cssx'; export const className = sx('p-4');";
  try {
    await writeFile(source, code);
    fsMocks.delayReadPath = canonicalPathSync(source);
    fsMocks.delayReadMs = 40;
    const firstScan = scanProjectCssxSourceModules(root, options);
    await new Promise((resolve) => setTimeout(resolve, 5));
    const concurrentScan = scanProjectCssxSourceModules(root, options);
    const transformed = await transformCssxModule(code, source, options, undefined, { compileCss: false });
    const concurrentUpdate = updateProjectScanModule(root, source, options, transformed, code);
    await expect(firstScan).resolves.toHaveLength(1);
    await expect(concurrentScan).resolves.toHaveLength(1);
    await expect(concurrentUpdate).resolves.toBe(true);
    expect(getCachedProjectScanSourceModules(root, options)?.[0]?.candidates).toHaveProperty('p-4');

    await expect(updateProjectScanModule(join(root, 'missing'), source, options, null)).resolves.toBe(false);
    const plainFile = join(root, 'plain.ts');
    await writeFile(plainFile, 'export const plain = true;');
    await expect(updateProjectScanModule(root, plainFile, options, null)).resolves.toBe(false);
    await expect(updateProjectScanModule(root, source, options, null)).resolves.toBe(true);
    expect(getCachedProjectScanSourceModules(root, options)).toEqual([]);
  } finally {
    fsMocks.errorOperation = '';
    fsMocks.errorPath = '';
    fsMocks.delayReadPath = '';
    await rm(root, { recursive: true, force: true });
  }
});
