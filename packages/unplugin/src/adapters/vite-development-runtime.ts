import { readFile } from 'node:fs/promises';

import { moduleId } from '../core/options';
import { sourceSignature } from '../core/source-signature';
import { cssWithSourceMapComment } from '../native/stylesheet';
import { hasCssxStyleData, type ModuleCssxData } from '../transforms/module-cssx-data';
import type { ViteDevelopmentServerOptions, ViteServerLike } from './configure-vite-development-server';
import { compileViteDevelopmentStylesheet, configureViteDevelopmentServer } from './configure-vite-development-server';
import { sendViteStyles } from './vite-dev';
import { createViteNativeSourceWatcher } from './vite-native-source-watcher';

/** Maximum source digests retained to recognize eager Vite stylesheet updates. */
const MAX_PREPARED_VITE_UPDATES = 64;
/** Maximum distinct source updates transformed at once by one Vite plugin instance. */
const MAX_IN_FLIGHT_VITE_UPDATES = 256;
/** Maximum source modules transformed concurrently by one Vite plugin instance. */
const MAX_CONCURRENT_VITE_TRANSFORMS = 4;

/** Creates and owns one Vite development transport and its bounded source watcher. */
export function createViteDevelopmentRuntime(
  server: ViteServerLike,
  configuration: ViteDevelopmentServerOptions,
  dataById: Map<string, ModuleCssxData>,
  transformSource: (source: string, id: string) => Promise<unknown>,
) {
  const preparedUpdates = new Map<string, string>();
  const inFlightUpdates = new Map<
    string,
    { promise: Promise<boolean>; rerun: boolean; sourceId?: string; source?: string }
  >();
  const transformWaiters: Array<() => void> = [];
  let active = true;
  let activeTransforms = 0;
  let stylesheetRevision = 0;
  let notifyPromise: Promise<void> | undefined;
  let latestCss: string | undefined;
  let inFlightLimitWarned = false;
  const rememberPreparedUpdate = (id: string, sourceId: string) => {
    if (preparedUpdates.size >= MAX_PREPARED_VITE_UPDATES && !preparedUpdates.has(id)) {
      const oldestId = preparedUpdates.keys().next().value;
      /* v8 ignore next -- A non-empty prepared map is required to reach this branch. */
      if (oldestId !== undefined) {
        preparedUpdates.delete(oldestId);
      }
    }
    preparedUpdates.set(id, sourceId);
  };
  const nativeSourceWatcher = server.watcher
    ? createViteNativeSourceWatcher((path) => {
        void updateCssOnlySource(path);
      })
    : undefined;
  const withTransformSlot = async <T>(callback: () => Promise<T>): Promise<T> => {
    if (activeTransforms >= MAX_CONCURRENT_VITE_TRANSFORMS) {
      await new Promise<void>((resume) => transformWaiters.push(resume));
    } else {
      activeTransforms++;
    }
    try {
      return await callback();
    } finally {
      const resume = transformWaiters.shift();
      if (resume) {
        resume();
      } else {
        activeTransforms--;
      }
    }
  };
  const notifyStyles = () => {
    if (!active) {
      return Promise.resolve();
    }
    stylesheetRevision++;
    if (!notifyPromise) {
      notifyPromise = (async () => {
        let publishedRevision = -1;
        do {
          publishedRevision = stylesheetRevision;
          try {
            const stylesheet = await compileViteDevelopmentStylesheet(configuration);
            const css = cssWithSourceMapComment(stylesheet, configuration.cssFileName);
            if (css !== latestCss) {
              sendViteStyles(server, css);
              latestCss = css;
            }
          } catch (error) {
            console.warn(
              `CSSX: Vite stylesheet update failed: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
        } while (active && publishedRevision !== stylesheetRevision);
      })().finally(() => {
        notifyPromise = undefined;
      });
    }
    return notifyPromise!;
  };
  const updateCssOnlySourceNow = async (
    id: string,
    normalizedId: string,
    previousSourceId?: string,
    preparedSource?: string,
  ): Promise<{ sourceId: string; handled: boolean } | undefined> => {
    const previousSignature = dataById.get(normalizedId)?.cssOnlySignature;
    if (!active || !previousSignature) {
      return undefined;
    }
    try {
      const source = preparedSource ?? (await readFile(normalizedId, 'utf8'));
      const sourceId = sourceSignature(source);
      if (!active) {
        return undefined;
      }
      if (previousSourceId === sourceId || preparedUpdates.get(normalizedId) === sourceId) {
        return { sourceId, handled: true };
      }
      const previous = dataById.get(normalizedId);
      await transformSource(source, id);
      const updated = dataById.get(normalizedId);
      if (updated?.cssOnlySignature !== previousSignature) {
        preparedUpdates.delete(normalizedId);
        if (previous) {
          dataById.set(normalizedId, previous);
        }
        return { sourceId, handled: false };
      }
      rememberPreparedUpdate(normalizedId, sourceId);
      await notifyStyles();
      return { sourceId, handled: true };
    } catch (error) {
      preparedUpdates.delete(normalizedId);
      console.warn(`CSSX: Vite stylesheet update failed: ${error instanceof Error ? error.message : String(error)}`);
      return undefined;
    }
  };
  const updateCssOnlySource = (id: string, source?: string): Promise<boolean> => {
    const normalizedId = moduleId(id);
    const existing = inFlightUpdates.get(normalizedId);
    if (existing) {
      existing.rerun = true;
      if (source !== undefined) {
        existing.source = source;
      }
      return existing.promise;
    }
    if (inFlightUpdates.size >= MAX_IN_FLIGHT_VITE_UPDATES) {
      if (!inFlightLimitWarned) {
        inFlightLimitWarned = true;
        console.warn(`CSSX: Vite stylesheet update queue reached the ${MAX_IN_FLIGHT_VITE_UPDATES}-path limit.`);
      }
      return Promise.resolve(false);
    }
    const update: { promise: Promise<boolean>; rerun: boolean; sourceId?: string; source?: string } = {
      promise: Promise.resolve(false),
      rerun: false,
      source,
    };
    update.promise = (async () => {
      let handled = false;
      do {
        update.rerun = false;
        if (!active) {
          return handled;
        }
        const source = update.source;
        update.source = undefined;
        const result = await withTransformSlot(() => updateCssOnlySourceNow(id, normalizedId, update.sourceId, source));
        if (result !== undefined) {
          update.sourceId = result.sourceId;
          handled = result.handled;
        } else {
          handled = false;
        }
      } while (active && update.rerun);
      return handled;
    })().finally(() => {
      inFlightUpdates.delete(normalizedId);
    });
    inFlightUpdates.set(normalizedId, update);
    return update.promise;
  };
  const close = () => {
    active = false;
    nativeSourceWatcher?.close();
    preparedUpdates.clear();
    inFlightUpdates.clear();
  };
  server.watcher?.on('close', close);
  configureViteDevelopmentServer(server, configuration);
  return {
    close,
    delete(id: string) {
      const normalizedId = moduleId(id);
      preparedUpdates.delete(normalizedId);
      nativeSourceWatcher?.unwatch(normalizedId);
    },
    isActive: () => active,
    isPrepared: (id: string, source: string) => preparedUpdates.get(moduleId(id)) === sourceSignature(source),
    notifyStyles,
    onTransformed(id: string, source: string) {
      const data = dataById.get(moduleId(id));
      if (data && hasCssxStyleData(data)) {
        rememberPreparedUpdate(moduleId(id), sourceSignature(source));
        nativeSourceWatcher?.watch(id);
      } else {
        preparedUpdates.delete(moduleId(id));
        nativeSourceWatcher?.unwatch(id);
      }
    },
    updateCssOnlySource,
  };
}
