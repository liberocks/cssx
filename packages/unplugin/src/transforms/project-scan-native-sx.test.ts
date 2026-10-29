import { EventEmitter } from 'node:events';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { releaseProjectScan, scanProjectCssxSourceModules, watchProjectCssxSourceModules } from './project-scan';

const mocks = vi.hoisted(() => ({
  scanNative: vi.fn(),
  watchListeners: [] as Array<(event: string, fileName: string | null) => void>,
}));

vi.mock('./native-static-sx', () => ({ scanNativeStaticSxModule: mocks.scanNative }));
vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    watch: ((...args: unknown[]) => {
      const listener = args[1] as (event: string, fileName: string | null) => void;
      const watcher = Object.assign(new EventEmitter(), {
        close: () => undefined,
        unref: () => watcher,
      });
      mocks.watchListeners.push(listener);
      return watcher as unknown as ReturnType<typeof actual.watch>;
    }) as typeof actual.watch,
  };
});

afterEach(() => {
  mocks.scanNative.mockReset();
  mocks.watchListeners.length = 0;
});

describe('project scanning with the native static-sx path', () => {
  it('collects handled modules with and without metadata', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cssx-project-scan-native-manifest-'));
    const source = join(root, 'component.tsx');
    const options = {
      mode: 'development' as const,
      coordination: 'manifest' as const,
      manifestPath: join(root, 'classes.json'),
    };
    const module = {
      id: source,
      candidates: { 'p-4': 's0x' },
      composites: { s0x: ['s0x'] },
      atomicClasses: [],
      origins: {},
    };
    try {
      await writeFile(source, `import { sx } from '@cssxio/cssx'; export const value = sx('p-4');`);
      mocks.scanNative.mockResolvedValueOnce({ handled: true, module });
      await expect(scanProjectCssxSourceModules(root, options)).resolves.toEqual([module]);

      mocks.scanNative.mockResolvedValueOnce({ handled: true });
      await expect(
        scanProjectCssxSourceModules(root, { ...options, manifestPath: join(root, 'empty.json') }),
      ).resolves.toEqual([]);
    } finally {
      releaseProjectScan(root, options);
      await rm(root, { recursive: true, force: true });
    }
  });

  it('replaces cached metadata when a changed source is handled without emitted metadata', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cssx-project-scan-native-cache-'));
    const source = join(root, 'component.tsx');
    const options = { mode: 'development' as const };
    const module = {
      id: source,
      candidates: { 'p-4': 's0x' },
      composites: { s0x: ['s0x'] },
      atomicClasses: [],
      origins: {},
    };
    try {
      await writeFile(source, `import { sx } from '@cssxio/cssx'; export const value = sx('p-4');`);
      mocks.scanNative.mockResolvedValueOnce({ handled: true, module });
      await expect(scanProjectCssxSourceModules(root, options)).resolves.toEqual([module]);

      await writeFile(source, `import { sx } from '@cssxio/cssx'; export const value = sx('p-8');`);
      mocks.scanNative.mockResolvedValueOnce({ handled: true });
      await expect(scanProjectCssxSourceModules(root, options)).resolves.toEqual([]);
    } finally {
      releaseProjectScan(root, options);
      await rm(root, { recursive: true, force: true });
    }
  });

  it('updates changed files through the watcher and removes metadata for empty native results', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cssx-project-scan-native-watch-'));
    const source = join(root, 'component.tsx');
    const options = { mode: 'development' as const };
    const module = {
      id: source,
      candidates: { 'p-4': 's0x' },
      composites: { s0x: ['s0x'] },
      atomicClasses: [],
      origins: {},
    };
    try {
      await writeFile(source, `import { sx } from '@cssxio/cssx'; export const value = sx('p-4');`);
      mocks.scanNative.mockResolvedValueOnce({ handled: true });
      await expect(scanProjectCssxSourceModules(root, options)).resolves.toEqual([]);

      let notifyUpdate: (() => void) | undefined;
      let updateCount = 0;
      const onUpdate = vi.fn(() => {
        updateCount += 1;
        notifyUpdate?.();
      });
      const stop = await watchProjectCssxSourceModules(root, options, onUpdate);
      const fileChanged = mocks.watchListeners[0]!;

      const waitForUpdate = () => new Promise<void>((resolve) => (notifyUpdate = resolve));
      mocks.scanNative.mockResolvedValueOnce({ handled: true, module });
      const added = waitForUpdate();
      await writeFile(source, `import { sx } from '@cssxio/cssx'; export const value = sx('p-8');`);
      fileChanged('change', 'component.tsx');
      await added;
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(onUpdate).toHaveBeenCalledTimes(1);

      mocks.scanNative.mockResolvedValueOnce({ handled: true });
      const removed = waitForUpdate();
      await writeFile(source, `import { sx } from '@cssxio/cssx'; export const value = sx('p-2');`);
      fileChanged('change', 'component.tsx');
      await removed;
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(onUpdate).toHaveBeenCalledTimes(2);
      expect(updateCount).toBe(2);

      mocks.scanNative.mockResolvedValueOnce({ handled: true });
      await writeFile(source, `import { sx } from '@cssxio/cssx'; export const value = sx('p-3');`);
      fileChanged('change', 'component.tsx');
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(onUpdate).toHaveBeenCalledTimes(2);
      stop();
    } finally {
      releaseProjectScan(root, options);
      await rm(root, { recursive: true, force: true });
    }
  });
});
