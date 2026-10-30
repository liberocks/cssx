import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it, vi } from 'vitest';

import { canonicalPathSync } from '../core/canonical-path';
import {
  getCachedProjectScanSourceModules,
  scanProjectCssxSourceModules,
  updateProjectScanModule,
  watchProjectCssxSourceModules,
} from './project-scan';
import { transformCssxModule } from './transform';

const watchMocks = vi.hoisted(() => ({
  capture: false,
  fail: false,
  failWithString: false,
  watchers: [] as Array<{
    path: string;
    callback: (event: string, fileName: string | Buffer | null) => void;
    onError?: (error: NodeJS.ErrnoException) => void;
    closed: boolean;
  }>,
}));
const readdirMocks = vi.hoisted(() => ({
  path: '',
  gate: undefined as Promise<void> | undefined,
  readStarted: undefined as (() => void) | undefined,
  fail: false,
  failWithString: false,
  pathCalls: 0,
  gateAtCall: 1,
}));

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    watch: ((path: string, callback: (event: string, fileName: string | Buffer | null) => void) => {
      if (!watchMocks.capture) {
        return actual.watch(path, callback);
      }
      if (watchMocks.fail) {
        if (watchMocks.failWithString) {
          throw 'watch unavailable with a string';
        }
        throw new Error('watch unavailable');
      }
      const record: (typeof watchMocks.watchers)[number] = { path, callback, closed: false };
      watchMocks.watchers.push(record);
      return {
        on: (_event: string, listener: (error: NodeJS.ErrnoException) => void) => {
          record.onError = listener;
          return this;
        },
        unref: () => undefined,
        close: () => {
          record.closed = true;
          return this;
        },
      };
    }) as typeof actual.watch,
  };
});

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return {
    ...actual,
    readdir: async (...args: Parameters<typeof actual.readdir>) => {
      if (String(args[0]) === readdirMocks.path && readdirMocks.fail) {
        if (readdirMocks.failWithString) {
          throw 'directory scan unavailable';
        }
        throw new Error('directory scan unavailable');
      }
      if (String(args[0]) === readdirMocks.path && readdirMocks.gate) {
        readdirMocks.pathCalls++;
        if (readdirMocks.pathCalls === readdirMocks.gateAtCall) {
          const gate = readdirMocks.gate;
          readdirMocks.gate = undefined;
          readdirMocks.readStarted?.();
          await gate;
        }
      }
      return actual.readdir(...args);
    },
  };
});

it('coalesces directory events, transforms named changes, and closes watchers and cache state', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-project-scan-watcher-'));
  const sourceDirectory = join(root, 'src');
  const sourceFile = join(sourceDirectory, 'component.tsx');
  const themeFile = join(root, 'theme.css');
  const options = {
    naming: 'source' as const,
    stableClassNames: true,
    themeFile,
    sourceRoots: [sourceDirectory, sourceDirectory],
  };
  let updates = 0;
  let stop: (() => void) | undefined;
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  try {
    await mkdir(sourceDirectory, { recursive: true });
    await writeFile(themeFile, '@theme reference { --color-brand: red; }');
    await writeFile(sourceFile, "import { sx } from '@cssxio/cssx'; export const className = sx('p-4');");
    await scanProjectCssxSourceModules(root, options);
    watchMocks.capture = true;
    watchMocks.watchers.length = 0;
    stop = await watchProjectCssxSourceModules(root, options, () => {
      updates++;
    });
    const initialWatchers = [...watchMocks.watchers];
    expect(initialWatchers.map(({ path }) => path)).toContain(canonicalPathSync(root));
    expect(initialWatchers.map(({ path }) => path)).toContain(canonicalPathSync(sourceDirectory));
    expect(await watchProjectCssxSourceModules(root, options, () => undefined)).toBe(stop);
    expect(watchMocks.watchers).toHaveLength(initialWatchers.length);

    await writeFile(sourceFile, "import { sx } from '@cssxio/cssx'; export const className = sx('p-8');");
    initialWatchers
      .find(({ path }) => path === canonicalPathSync(sourceDirectory))!
      .callback('rename', 'component.tsx');
    await waitFor(() => getCachedProjectScanSourceModules(root, options)?.[0]?.candidates['p-8']);
    expect(updates).toBe(1);

    initialWatchers
      .find(({ path }) => path === canonicalPathSync(sourceDirectory))!
      .callback('change', 'component.tsx');
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(updates).toBe(1);

    initialWatchers.find(({ path }) => path === canonicalPathSync(root))!.callback('change', 'theme.css');
    await waitFor(() => updates === 2);
    initialWatchers.find(({ path }) => path === canonicalPathSync(root))!.callback('change', 'unrelated.css');
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(updates).toBe(2);

    await mkdir(join(root, '.open-next'));
    await writeFile(join(sourceDirectory, 'README.md'), '# notes');
    initialWatchers.find(({ path }) => path === canonicalPathSync(root))!.callback('rename', '.open-next');
    initialWatchers.find(({ path }) => path === canonicalPathSync(sourceDirectory))!.callback('change', 'README.md');
    initialWatchers.find(({ path }) => path === canonicalPathSync(sourceDirectory))!.callback('change', 'image.png');
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(updates).toBe(2);

    const nestedDirectory = join(sourceDirectory, 'nested');
    const nestedFile = join(nestedDirectory, 'nested.tsx');
    await mkdir(nestedDirectory);
    await writeFile(nestedFile, "import { sx } from '@cssxio/cssx'; export const className = sx('m-4');");
    initialWatchers.find(({ path }) => path === canonicalPathSync(sourceDirectory))!.callback('rename', 'nested');
    await waitFor(() =>
      getCachedProjectScanSourceModules(root, options)?.some(({ id }) => id === canonicalPathSync(nestedFile)),
    );
    await waitFor(() => watchMocks.watchers.find(({ path }) => path === canonicalPathSync(nestedDirectory)));
    const nestedWatcher = watchMocks.watchers.find(({ path }) => path === canonicalPathSync(nestedDirectory))!;

    await rm(nestedDirectory, { recursive: true, force: true });
    initialWatchers.find(({ path }) => path === canonicalPathSync(sourceDirectory))!.callback('rename', 'nested');
    await waitFor(
      () => !getCachedProjectScanSourceModules(root, options)?.some(({ id }) => id === canonicalPathSync(nestedFile)),
    );
    await waitFor(() => nestedWatcher.closed);
    expect(nestedWatcher.closed).toBe(true);

    const beforeUnknownName = updates;
    initialWatchers.find(({ path }) => path === canonicalPathSync(sourceDirectory))!.callback('rename', null);
    await waitFor(() => updates === beforeUnknownName + 1);
    await writeFile(sourceFile, "import { sx } from '@cssxio/cssx'; export const className = sx('p-24');");
    initialWatchers
      .find(({ path }) => path === canonicalPathSync(sourceDirectory))!
      .callback('change', 'component.tsx');
    stop();
    stop = undefined;
    expect(getCachedProjectScanSourceModules(root, options)).toBeUndefined();
    expect(initialWatchers.every(({ closed }) => closed)).toBe(true);
    initialWatchers
      .find(({ path }) => path === canonicalPathSync(sourceDirectory))!
      .callback('change', 'component.tsx');
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(updates).toBe(beforeUnknownName + 1);
  } finally {
    stop?.();
    watchMocks.capture = false;
    watchMocks.fail = false;
    watchMocks.failWithString = false;
    warning.mockRestore();
    await rm(root, { recursive: true, force: true });
  }
});

it('skips Rollup-owned source events and removes deleted source metadata from the cache', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-project-scan-watcher-bundler-owned-'));
  const sourceDirectory = join(root, 'src');
  const sourceFile = join(sourceDirectory, 'component.tsx');
  const options = { sourceMap: false, preflight: false };
  const oldSource = "import { sx } from '@cssxio/cssx'; export const className = sx('p-4');";
  const newSource = "import { sx } from '@cssxio/cssx'; export const className = sx('p-8');";
  let updates = 0;
  let stop: (() => void) | undefined;
  try {
    await mkdir(sourceDirectory, { recursive: true });
    await writeFile(sourceFile, oldSource);
    await scanProjectCssxSourceModules(root, options);
    watchMocks.capture = true;
    watchMocks.watchers.length = 0;
    stop = await watchProjectCssxSourceModules(
      root,
      options,
      () => {
        updates++;
      },
      (path) => path === canonicalPathSync(sourceFile),
    );
    await writeFile(sourceFile, newSource);
    watchMocks.watchers
      .find(({ path }) => path === canonicalPathSync(sourceDirectory))!
      .callback('change', 'component.tsx');
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(updates).toBe(0);
    expect(getCachedProjectScanSourceModules(root, options)?.[0]?.candidates['p-4']).toBeDefined();

    const transformed = await transformCssxModule(newSource, sourceFile);
    await updateProjectScanModule(root, sourceFile, options, transformed, newSource);
    expect(getCachedProjectScanSourceModules(root, options)?.[0]?.candidates['p-8']).toBeDefined();

    await rm(sourceFile);
    await updateProjectScanModule(root, sourceFile, options, null);
    expect(getCachedProjectScanSourceModules(root, options)).toEqual([]);
  } finally {
    stop?.();
    watchMocks.capture = false;
    await rm(root, { recursive: true, force: true });
  }
});

it('bounds queued paths during large file event bursts and reconciles once', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-project-scan-watcher-burst-'));
  const sourceDirectory = join(root, 'src');
  const options = { sourceMap: false, preflight: false };
  let updates = 0;
  let stop: (() => void) | undefined;
  try {
    await mkdir(sourceDirectory, { recursive: true });
    await writeFile(
      join(sourceDirectory, 'page.tsx'),
      "import { sx } from '@cssxio/cssx'; export const className = sx('p-4');",
    );
    await scanProjectCssxSourceModules(root, options);
    watchMocks.capture = true;
    watchMocks.watchers.length = 0;
    stop = await watchProjectCssxSourceModules(root, options, () => {
      updates++;
    });

    const sourceWatcher = watchMocks.watchers.find(({ path }) => path === canonicalPathSync(sourceDirectory))!;
    for (let index = 0; index < 1_000; index++) {
      sourceWatcher.callback('change', `missing-${index}.tsx`);
    }
    await waitFor(() => updates === 1);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(updates).toBe(1);
    expect(getCachedProjectScanSourceModules(root, options)).toHaveLength(1);
  } finally {
    stop?.();
    watchMocks.capture = false;
    await rm(root, { recursive: true, force: true });
  }
});

it('caps source directory watchers across large workspaces', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-project-scan-watcher-limit-'));
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  const options = { sourceMap: false, preflight: false };
  let stop: (() => void) | undefined;
  try {
    await Promise.all(
      Array.from({ length: 140 }, async (_, index) => {
        const directory = join(root, `package-${index}`);
        await mkdir(directory, { recursive: true });
        await writeFile(
          join(directory, `component-${index}.tsx`),
          `import { sx } from '@cssxio/cssx'; export const className = sx('p-${index + 1}');`,
        );
      }),
    );
    await scanProjectCssxSourceModules(root, options);
    watchMocks.capture = true;
    watchMocks.watchers.length = 0;
    stop = await watchProjectCssxSourceModules(root, options, () => undefined);

    expect(watchMocks.watchers).toHaveLength(64);
    expect(warning).toHaveBeenCalledWith('CSSX: development source watcher reached the 64-directory limit.');
    stop();
    stop = undefined;
    expect(watchMocks.watchers.every(({ closed }) => closed)).toBe(true);
  } finally {
    stop?.();
    watchMocks.capture = false;
    warning.mockRestore();
    await rm(root, { recursive: true, force: true });
  }
});

it('ignores source events until the project metadata cache has been initialized', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-project-scan-watcher-no-cache-'));
  const sourceDirectory = join(root, 'src');
  const sourceFile = join(sourceDirectory, 'page.tsx');
  const options = { sourceMap: false, preflight: false };
  let updates = 0;
  let stop: (() => void) | undefined;
  try {
    await mkdir(sourceDirectory, { recursive: true });
    await writeFile(sourceFile, "import { sx } from '@cssxio/cssx'; export const className = sx('p-4');");
    watchMocks.capture = true;
    watchMocks.watchers.length = 0;
    stop = await watchProjectCssxSourceModules(root, options, () => {
      updates++;
    });
    watchMocks.watchers.find(({ path }) => path === canonicalPathSync(root))!.callback('change', 'src/page.tsx');
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(updates).toBe(0);
    expect(getCachedProjectScanSourceModules(root, options)).toBeUndefined();
  } finally {
    stop?.();
    watchMocks.capture = false;
    await rm(root, { recursive: true, force: true });
  }
});

it('uses directory watchers rather than allocating one watcher for every source module', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-project-scan-watcher-count-'));
  const sourceDirectory = join(root, 'src');
  const options = { sourceMap: false, preflight: false };
  let stop: (() => void) | undefined;
  try {
    await mkdir(sourceDirectory, { recursive: true });
    await Promise.all(
      Array.from({ length: 400 }, (_, index) =>
        writeFile(join(sourceDirectory, `component-${index}.tsx`), 'export const plain = true;'),
      ),
    );
    await scanProjectCssxSourceModules(root, options);
    watchMocks.capture = true;
    watchMocks.watchers.length = 0;
    stop = await watchProjectCssxSourceModules(root, options, () => undefined);

    expect(watchMocks.watchers.map(({ path }) => path).sort()).toEqual([canonicalPathSync(root)].sort());
    watchMocks.watchers[0]!.callback('change', 'unrelated.css');
    await new Promise((resolve) => setTimeout(resolve, 20));
  } finally {
    stop?.();
    watchMocks.capture = false;
    await rm(root, { recursive: true, force: true });
  }
});

it('reports watcher startup and runtime failures without leaking cache state', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-project-scan-watcher-error-'));
  await mkdir(join(root, 'src'), { recursive: true });
  await writeFile(
    join(root, 'src', 'page.tsx'),
    "import { sx } from '@cssxio/cssx'; export const className = sx('p-4');",
  );
  const options = { sourceMap: false, preflight: false };
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  try {
    await scanProjectCssxSourceModules(root, options);
    watchMocks.capture = true;
    watchMocks.watchers.length = 0;
    watchMocks.fail = true;
    const stopFailed = await watchProjectCssxSourceModules(root, options, () => undefined);
    await vi.waitFor(() => expect(warning).toHaveBeenCalledWith(expect.stringContaining('watch unavailable')));
    expect(warning).toHaveBeenCalledOnce();
    stopFailed();
    expect(getCachedProjectScanSourceModules(root, options)).toBeUndefined();

    watchMocks.fail = false;
    const stop = await watchProjectCssxSourceModules(root, options, () => undefined);
    const staleError = Object.assign(new Error('watch backend stopped'), { code: 'EMFILE' });
    const onError = watchMocks.watchers[0]!.onError;
    onError?.(staleError);
    onError?.(staleError);
    expect(warning).toHaveBeenCalledWith(expect.stringContaining('watch backend stopped'));
    stop();

    const missingRootStop = await watchProjectCssxSourceModules(
      root,
      {
        ...options,
        sourceRoots: [join(root, 'missing-source-root')],
      },
      () => undefined,
    );
    missingRootStop();

    watchMocks.fail = true;
    watchMocks.failWithString = true;
    const stringFailureStop = await watchProjectCssxSourceModules(root, options, () => undefined);
    await vi.waitFor(() =>
      expect(warning).toHaveBeenCalledWith(expect.stringContaining('watch unavailable with a string')),
    );
    stringFailureStop();
  } finally {
    watchMocks.capture = false;
    watchMocks.fail = false;
    watchMocks.failWithString = false;
    warning.mockRestore();
    await rm(root, { recursive: true, force: true });
  }
});

it('reports a non-Error failure while scanning source directories', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-project-scan-directory-error-'));
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  let stop: (() => void) | undefined;
  try {
    readdirMocks.path = canonicalPathSync(root);
    readdirMocks.fail = true;
    readdirMocks.failWithString = true;
    stop = await watchProjectCssxSourceModules(root, { sourceMap: false, preflight: false }, () => undefined);

    expect(warning).toHaveBeenCalledWith(
      'CSSX: development source watcher could not start: directory scan unavailable',
    );
  } finally {
    stop?.();
    readdirMocks.path = '';
    readdirMocks.fail = false;
    readdirMocks.failWithString = false;
    warning.mockRestore();
    await rm(root, { recursive: true, force: true });
  }
});

it('suppresses update errors after the watcher has stopped', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-project-scan-stopped-update-'));
  const sourceDirectory = join(root, 'src');
  const sourceFile = join(sourceDirectory, 'page.tsx');
  const options = { sourceMap: false, preflight: false };
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  let rejectUpdate: ((error: Error) => void) | undefined;
  let stop: (() => void) | undefined;
  try {
    await mkdir(sourceDirectory, { recursive: true });
    await writeFile(sourceFile, "import { sx } from '@cssxio/cssx'; export const className = sx('p-4');");
    await scanProjectCssxSourceModules(root, options);
    watchMocks.capture = true;
    watchMocks.watchers.length = 0;
    stop = await watchProjectCssxSourceModules(
      root,
      options,
      () =>
        new Promise<void>((_resolve, reject) => {
          rejectUpdate = reject;
        }),
    );
    await writeFile(sourceFile, "import { sx } from '@cssxio/cssx'; export const className = sx('p-8');");
    watchMocks.watchers.find(({ path }) => path === canonicalPathSync(sourceDirectory))!.callback('change', 'page.tsx');
    await waitFor(() => rejectUpdate);
    stop();
    stop = undefined;
    rejectUpdate?.(new Error('watcher stopped'));
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(warning).not.toHaveBeenCalled();
  } finally {
    stop?.();
    watchMocks.capture = false;
    warning.mockRestore();
    await rm(root, { recursive: true, force: true });
  }
});

it('reports primitive update failures without retaining extra work', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-project-scan-watcher-value-error-'));
  const themeFile = join(root, 'theme.css');
  const options = { themeFile, sourceMap: false, preflight: false };
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  let stop: (() => void) | undefined;
  try {
    await writeFile(themeFile, '@theme reference { --color-brand: red; }');
    await scanProjectCssxSourceModules(root, options);
    watchMocks.capture = true;
    watchMocks.watchers.length = 0;
    stop = await watchProjectCssxSourceModules(root, options, () => {
      throw 'watch update failure';
    });
    watchMocks.watchers.find(({ path }) => path === canonicalPathSync(root))!.callback('change', 'theme.css');

    await waitFor(() => warning.mock.calls.some(([message]) => String(message).includes('watch update failure')));
    expect(warning).toHaveBeenCalledWith('CSSX: development source update failed: watch update failure');
  } finally {
    stop?.();
    watchMocks.capture = false;
    warning.mockRestore();
    await rm(root, { recursive: true, force: true });
  }
});

it('does not reopen watchers or scan after stopping during directory reconciliation', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-project-scan-reconcile-stop-'));
  const sourceDirectory = join(root, 'src');
  const sourceFile = join(sourceDirectory, 'page.tsx');
  const options = { sourceMap: false, preflight: false };
  let releaseRead!: () => void;
  let markReadStarted!: () => void;
  const readStarted = new Promise<void>((resolve) => {
    markReadStarted = resolve;
  });
  let stop: (() => void) | undefined;
  let updates = 0;
  try {
    await mkdir(sourceDirectory, { recursive: true });
    await writeFile(sourceFile, "import { sx } from '@cssxio/cssx'; export const className = sx('p-4');");
    await scanProjectCssxSourceModules(root, options);
    watchMocks.capture = true;
    watchMocks.watchers.length = 0;
    stop = await watchProjectCssxSourceModules(root, options, () => {
      updates++;
    });

    readdirMocks.path = canonicalPathSync(root);
    readdirMocks.pathCalls = 0;
    readdirMocks.gateAtCall = 2;
    readdirMocks.gate = new Promise<void>((resolve) => {
      releaseRead = resolve;
    });
    readdirMocks.readStarted = markReadStarted;
    watchMocks.watchers.find(({ path }) => path === canonicalPathSync(root))!.callback('rename', null);
    await readStarted;
    stop();
    stop = undefined;
    releaseRead();
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(updates).toBe(0);
    expect(getCachedProjectScanSourceModules(root, options)).toBeUndefined();
    expect(watchMocks.watchers.every(({ closed }) => closed)).toBe(true);
  } finally {
    releaseRead?.();
    readdirMocks.path = '';
    readdirMocks.gate = undefined;
    readdirMocks.readStarted = undefined;
    readdirMocks.pathCalls = 0;
    readdirMocks.gateAtCall = 1;
    stop?.();
    watchMocks.capture = false;
    await rm(root, { recursive: true, force: true });
  }
});

it('skips generated and dependency directories when opening source watchers', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-project-scan-watcher-pruned-'));
  const dependencyDirectory = join(root, 'node_modules', 'workspace-package');
  const source = join(dependencyDirectory, 'page.tsx');
  const code = "import { sx } from '@cssxio/cssx'; export const className = sx('p-4');";
  const options = { sourceMap: false, preflight: false };
  let stop: (() => void) | undefined;
  try {
    await mkdir(dependencyDirectory, { recursive: true });
    await writeFile(source, code);
    await scanProjectCssxSourceModules(root, options);
    const transformed = await transformCssxModule(code, source, options, undefined, { compileCss: false });
    await updateProjectScanModule(root, source, options, transformed, code);
    watchMocks.capture = true;
    watchMocks.watchers.length = 0;
    stop = await watchProjectCssxSourceModules(root, options, () => undefined);

    expect(watchMocks.watchers.map(({ path }) => path)).toEqual([canonicalPathSync(root)]);
  } finally {
    stop?.();
    watchMocks.capture = false;
    await rm(root, { recursive: true, force: true });
  }
});

it('reschedules source changes that arrive while stylesheet metadata is compiling', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-project-scan-flush-race-'));
  const sourceDirectory = join(root, 'src');
  const sourceFile = join(sourceDirectory, 'page.tsx');
  const options = { sourceMap: false, preflight: false };
  let updates = 0;
  let releaseFirstUpdate: (() => void) | undefined;
  let stop: (() => void) | undefined;
  try {
    await mkdir(sourceDirectory, { recursive: true });
    await writeFile(sourceFile, "import { sx } from '@cssxio/cssx'; export const className = sx('p-4');");
    await scanProjectCssxSourceModules(root, options);
    watchMocks.capture = true;
    watchMocks.watchers.length = 0;
    stop = await watchProjectCssxSourceModules(root, options, () => {
      updates++;
      if (updates === 1) {
        return new Promise<void>((resolve) => {
          releaseFirstUpdate = resolve;
        });
      }
    });
    const directoryWatcher = watchMocks.watchers.find(({ path }) => path === canonicalPathSync(sourceDirectory))!;

    await writeFile(sourceFile, "import { sx } from '@cssxio/cssx'; export const className = sx('p-8');");
    directoryWatcher.callback('change', 'page.tsx');
    await waitFor(() => updates === 1);

    await writeFile(sourceFile, "import { sx } from '@cssxio/cssx'; export const className = sx('p-12');");
    directoryWatcher.callback('change', 'page.tsx');
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(updates).toBe(1);

    releaseFirstUpdate?.();
    await waitFor(() => updates === 2 && getCachedProjectScanSourceModules(root, options)?.[0]?.candidates['p-12']);
  } finally {
    stop?.();
    watchMocks.capture = false;
    await rm(root, { recursive: true, force: true });
  }
});

/** Waits for an asynchronous watcher update. */
async function waitFor(condition: () => unknown): Promise<void> {
  const deadline = Date.now() + 2_000;
  while (!condition()) {
    if (Date.now() >= deadline) {
      throw new Error('Timed out waiting for project scan watcher update.');
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}
