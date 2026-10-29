import { EventEmitter } from 'node:events';
import type { FSWatcher } from 'node:fs';
import { join } from 'node:path';
import { expect, it, vi } from 'vitest';

import { createViteNativeSourceWatcher } from './vite-native-source-watcher';

function createWatcher() {
  const emitter = new EventEmitter();
  const close = vi.fn();
  return { close, emitter, watcher: Object.assign(emitter, { close, unref: vi.fn() }) as unknown as FSWatcher };
}

it('caps native directory watchers and closes them when Vite stops', () => {
  const nativeWatch = vi.fn(() => createWatcher().watcher);
  const watcher = createViteNativeSourceWatcher(vi.fn(), nativeWatch);

  for (let index = 0; index < 12; index++) {
    watcher.watch(join('/workspace', `package-${index}`, 'style.ts'));
  }

  expect(nativeWatch).toHaveBeenCalledTimes(8);
  const secondPluginWatcher = createViteNativeSourceWatcher(vi.fn(), nativeWatch);
  secondPluginWatcher.watch(join('/another-workspace', 'src', 'style.ts'));
  expect(nativeWatch).toHaveBeenCalledTimes(8);
  secondPluginWatcher.close();
  watcher.close();
  expect(nativeWatch.mock.results.map(({ value }) => value.close)).toHaveLength(8);
  expect(nativeWatch.mock.results.every(({ value }) => value.close.mock.calls.length === 1)).toBe(true);
});

it('bounds queued changes and disables native watching after an error', () => {
  vi.useFakeTimers();
  const changes: string[] = [];
  const first = createWatcher();
  let eventListener: ((eventType: 'change' | 'rename', fileName: string | Buffer | null) => void) | undefined;
  const nativeWatch = vi.fn(
    (
      _directory: string,
      _options: { readonly persistent: false },
      listener: (eventType: 'change' | 'rename', fileName: string | Buffer | null) => void,
    ) => {
      eventListener = listener;
      return first.watcher;
    },
  );
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  const watcher = createViteNativeSourceWatcher((id) => {
    changes.push(id);
  }, nativeWatch);
  try {
    for (let index = 0; index < 300; index++) {
      watcher.watch(join('/workspace/src', `style-${index}.ts`));
    }
    expect(nativeWatch).toHaveBeenCalledOnce();
    watcher.unwatch(join('/workspace/src', 'not-watched.ts'));
    for (let index = 0; index < 300; index++) {
      eventListener?.('change', `style-${index}.ts`);
    }
    vi.advanceTimersByTime(2);
    expect(changes).toHaveLength(256);

    eventListener?.('change', 'style-0.ts');
    watcher.unwatch(join('/workspace/src', 'style-0.ts'));
    vi.advanceTimersByTime(2);
    expect(changes).toHaveLength(256);

    first.emitter.emit('error', new Error('watcher exhausted'));
    first.emitter.emit('error', new Error('late watcher error'));
    expect(first.close).toHaveBeenCalledOnce();
    expect(warning).toHaveBeenCalledWith(expect.stringContaining("using Vite's watcher"));
    watcher.watch(join('/workspace/src', 'later.ts'));
    expect(nativeWatch).toHaveBeenCalledOnce();
  } finally {
    watcher.close();
    warning.mockRestore();
    vi.useRealTimers();
  }
});

it('clears pending directory-wide changes when Vite closes', () => {
  vi.useFakeTimers();
  const changes: string[] = [];
  let eventListener: ((eventType: 'change' | 'rename', fileName: string | Buffer | null) => void) | undefined;
  const nativeWatch = vi.fn(
    (
      _directory: string,
      _options: { readonly persistent: false },
      listener: (eventType: 'change' | 'rename', fileName: string | Buffer | null) => void,
    ) => {
      eventListener = listener;
      return createWatcher().watcher;
    },
  );
  const watcher = createViteNativeSourceWatcher((id) => {
    changes.push(id);
  }, nativeWatch);
  try {
    watcher.watch(join('/workspace/src', 'one.ts'));
    watcher.watch(join('/workspace/src', 'two.ts'));
    eventListener?.('rename', null);
    watcher.close();
    vi.advanceTimersByTime(2);
    expect(changes).toEqual([]);
  } finally {
    watcher.close();
    vi.useRealTimers();
  }
});

it('disables native watching when Node throws a non-Error failure', () => {
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  const nativeWatch = vi.fn(() => {
    throw 'watch unavailable';
  });
  const watcher = createViteNativeSourceWatcher(vi.fn(), nativeWatch);
  try {
    watcher.watch(join('/workspace/src', 'style.ts'));
    watcher.watch(join('/workspace/src', 'later.ts'));
    expect(nativeWatch).toHaveBeenCalledOnce();
    expect(warning).toHaveBeenCalledWith(expect.stringContaining('watch unavailable'));
  } finally {
    watcher.close();
    warning.mockRestore();
  }
});
