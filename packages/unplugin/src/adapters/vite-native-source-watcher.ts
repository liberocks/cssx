import { watch as watchDirectory, type FSWatcher } from 'node:fs';
import { dirname, resolve } from 'node:path';

/** Minimal injectable shape of Node's directory watcher for resource tests. */
type NativeWatch = (
  directory: string,
  options: { readonly persistent: false },
  listener: (eventType: 'change' | 'rename', fileName: string | Buffer | null) => void,
) => FSWatcher;

/** Native watcher and the CSSX modules currently mapped to its directory. */
interface DirectoryWatch {
  readonly watcher: FSWatcher;
  readonly ids: Set<string>;
}

/** Maximum native Vite source watcher handles across the process. */
const MAX_WATCHED_DIRECTORIES = 8;
/** Maximum distinct source notifications queued by one Vite plugin instance. */
const MAX_PENDING_SOURCE_CHANGES = 256;
/** Native Vite watchers shared by every CSSX plugin instance in this process. */
let activeViteNativeWatchers = 0;

/** Watches only directories with transformed CSSX modules and coalesces saves. */
export function createViteNativeSourceWatcher(
  onChange: (id: string) => void | Promise<void>,
  watch: NativeWatch = watchDirectory as NativeWatch,
  fallbackWatcher = "Vite's watcher",
) {
  const directories = new Map<string, DirectoryWatch>();
  const directoryById = new Map<string, string>();
  const changeTimers = new Map<string, ReturnType<typeof setTimeout>>();
  let nativeWatchingDisabled = false;

  const clearChangeTimer = (id: string) => {
    const timer = changeTimers.get(id);
    if (timer) {
      clearTimeout(timer);
      changeTimers.delete(id);
    }
  };

  const closeDirectory = (directory: string, state: DirectoryWatch) => {
    /* v8 ignore next -- Callers only pass the matching state retrieved from this directory map. */
    if (directories.get(directory) !== state) {
      return;
    }
    directories.delete(directory);
    activeViteNativeWatchers--;
    state.watcher.close();
    for (const id of state.ids) {
      directoryById.delete(id);
      clearChangeTimer(id);
    }
    state.ids.clear();
  };

  const scheduleChange = (id: string) => {
    if (changeTimers.has(id) || changeTimers.size >= MAX_PENDING_SOURCE_CHANGES) {
      return;
    }
    changeTimers.set(
      id,
      setTimeout(() => {
        changeTimers.delete(id);
        void onChange(id);
      }, 2),
    );
  };

  const disableNativeWatching = (error: Error) => {
    nativeWatchingDisabled = true;
    for (const [directory, state] of directories) {
      closeDirectory(directory, state);
    }
    console.warn(`CSSX: native source watcher failed; using ${fallbackWatcher}: ${error.message}`);
  };

  const unwatch = (id: string) => {
    const normalizedId = resolve(id);
    clearChangeTimer(normalizedId);
    const directory = directoryById.get(normalizedId);
    if (!directory) {
      return;
    }
    directoryById.delete(normalizedId);
    const state = directories.get(directory);
    state?.ids.delete(normalizedId);
    if (state && state.ids.size === 0) {
      closeDirectory(directory, state);
    }
  };

  const watchSource = (id: string) => {
    const normalizedId = resolve(id);
    if (nativeWatchingDisabled || directoryById.has(normalizedId)) {
      return;
    }
    const directory = dirname(normalizedId);
    let state = directories.get(directory);
    if (!state) {
      if (activeViteNativeWatchers >= MAX_WATCHED_DIRECTORIES) {
        return;
      }
      try {
        const ids = new Set<string>();
        const watcher = watch(directory, { persistent: false }, (_eventType, fileName) => {
          const changedIds =
            fileName === null ? [...ids] : [resolve(directory, fileName.toString())].filter((path) => ids.has(path));
          for (const changedId of changedIds) {
            scheduleChange(changedId);
          }
        });
        state = { watcher, ids };
        directories.set(directory, state);
        activeViteNativeWatchers++;
        watcher.on('error', (error) => {
          const current = directories.get(directory);
          if (current !== state) {
            return;
          }
          disableNativeWatching(error);
        });
      } catch (error) {
        disableNativeWatching(error instanceof Error ? error : new Error(String(error)));
        return;
      }
    }
    state.ids.add(normalizedId);
    directoryById.set(normalizedId, directory);
  };

  const close = () => {
    for (const [directory, state] of directories) {
      closeDirectory(directory, state);
    }
    directoryById.clear();
    /* v8 ignore next -- closeDirectory clears every timer owned by a watched directory. */
    for (const timer of changeTimers.values()) {
      clearTimeout(timer);
    }
    changeTimers.clear();
  };

  return { close, unwatch, watch: watchSource };
}
