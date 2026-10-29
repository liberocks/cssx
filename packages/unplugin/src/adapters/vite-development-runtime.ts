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

/** Creates and owns one Vite development transport and its bounded source watcher. */
export function createViteDevelopmentRuntime(
  server: ViteServerLike,
  configuration: ViteDevelopmentServerOptions,
  dataById: Map<string, ModuleCssxData>,
  transformSource: (source: string, id: string) => Promise<unknown>,
) {
  const preparedUpdates = new Map<string, string>();
  let active = true;
  const notifyStyles = async () => {
    if (!active) {
      return;
    }
    try {
      const stylesheet = await compileViteDevelopmentStylesheet(configuration);
      sendViteStyles(server, cssWithSourceMapComment(stylesheet, configuration.cssFileName));
    } catch (error) {
      console.warn(`CSSX: Vite stylesheet update failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  const updateCssOnlySource = async (id: string) => {
    const normalizedId = moduleId(id);
    const previousSignature = dataById.get(normalizedId)?.cssOnlySignature;
    if (!active || !previousSignature) {
      return;
    }
    try {
      const source = await readFile(normalizedId, 'utf8');
      const sourceId = sourceSignature(source);
      if (preparedUpdates.get(normalizedId) === sourceId) {
        return;
      }
      const previous = dataById.get(normalizedId);
      await transformSource(source, id);
      const updated = dataById.get(normalizedId);
      if (updated?.cssOnlySignature !== previousSignature) {
        preparedUpdates.delete(normalizedId);
        if (previous) {
          dataById.set(normalizedId, previous);
        }
        return;
      }
      if (preparedUpdates.size >= MAX_PREPARED_VITE_UPDATES && !preparedUpdates.has(normalizedId)) {
        const oldestId = preparedUpdates.keys().next().value;
        /* v8 ignore next -- A non-empty prepared map is required to reach this branch. */
        if (oldestId !== undefined) {
          preparedUpdates.delete(oldestId);
        }
      }
      preparedUpdates.set(normalizedId, sourceId);
      await notifyStyles();
    } catch (error) {
      preparedUpdates.delete(normalizedId);
      console.warn(`CSSX: Vite stylesheet update failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  const nativeSourceWatcher = server.watcher
    ? createViteNativeSourceWatcher((path) => {
        void updateCssOnlySource(path);
      })
    : undefined;
  server.watcher?.on('change', (path: string) => {
    void updateCssOnlySource(path);
  });
  server.watcher?.on('unlink', (path: string) => {
    preparedUpdates.delete(moduleId(path));
  });
  const close = () => {
    active = false;
    nativeSourceWatcher?.close();
    preparedUpdates.clear();
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
    onTransformed(id: string) {
      const data = dataById.get(moduleId(id));
      if (data && hasCssxStyleData(data)) {
        nativeSourceWatcher?.watch(id);
      } else {
        nativeSourceWatcher?.unwatch(id);
      }
    },
    updateCssOnlySource,
  };
}
