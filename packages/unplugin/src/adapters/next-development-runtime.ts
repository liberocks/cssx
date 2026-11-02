import { resolve } from 'node:path';

import type { CssxPluginOptions } from '../core/options';
import { startDevelopmentCoordinator } from './development-coordinator';
import {
  readNextDevelopmentStylesheetStatus,
  reportNextDevelopmentStartupStatus,
  retryNextDevelopmentServerOwnership,
  startNextDevelopmentServer,
  waitForNextDevelopmentServerBinding,
  type NextDevelopmentHmrConnection,
} from './next-development-server';

/** In-flight readiness checks deduplicated across Next compiler workers in one process. */
const startupByRoot = new Map<string, Promise<void>>();
/** Local transport references reused when this process is checked by multiple compiler hooks. */
const connectionByRoot = new Map<string, NextDevelopmentHmrConnection>();

/** Starts or joins the single stylesheet coordinator for a Next.js app root. */
export function ensureNextDevelopmentStylesheet(
  root: string,
  styleSheetFile: string,
  options: CssxPluginOptions,
): Promise<void> {
  const projectRoot = resolve(root);
  const existing = startupByRoot.get(projectRoot);
  if (existing) {
    return existing;
  }

  const startup = initializeNextDevelopmentStylesheet(projectRoot, resolve(styleSheetFile), options);
  startupByRoot.set(projectRoot, startup);
  void startup.then(
    () => startupByRoot.delete(projectRoot),
    () => startupByRoot.delete(projectRoot),
  );
  return startup;
}

/** Acquires an endpoint, starts the owner coordinator, and waits for a reported result. */
async function initializeNextDevelopmentStylesheet(
  root: string,
  styleSheetFile: string,
  options: CssxPluginOptions,
): Promise<void> {
  const deadline = Date.now() + 30_000;
  let phase = 'transport ownership';
  let lastError = 'the transport did not return a status';
  let connection = connectionByRoot.get(root);
  if (!connection) {
    connection = startNextDevelopmentServer(root, styleSheetFile);
    connectionByRoot.set(root, connection);
  }

  while (Date.now() < deadline) {
    try {
      const ownership = await waitForNextDevelopmentServerBinding(root);
      phase = 'stylesheet readiness';
      let status = await readNextDevelopmentStylesheetStatus(connection);
      if (status.root !== root || status.stylesheetFile !== styleSheetFile) {
        throw new Error(
          `CSSX endpoint identity mismatch: expected ${root} and ${styleSheetFile}, received ${status.root} and ${status.stylesheetFile}.`,
        );
      }
      if (status.state === 'ready') {
        return;
      }
      if (status.state === 'failed') {
        throw new Error(
          `CSSX Next.js stylesheet startup failed during ${status.phase}: ${status.error ?? 'unknown error'}`,
        );
      }
      if (ownership === 'owner') {
        phase = 'initial source scan';
        await startOwnerCoordinator(root, styleSheetFile, options, connection);
        status = await readNextDevelopmentStylesheetStatus(connection);
        if (status.state === 'ready') {
          return;
        }
        if (status.state === 'failed') {
          throw new Error(
            `CSSX Next.js stylesheet startup failed during ${status.phase}: ${status.error ?? 'unknown error'}`,
          );
        }
      }
      lastError = `startup remains in phase ${status.phase}`;
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('CSSX Next.js stylesheet startup failed')) {
        throw error;
      }
      lastError = error instanceof Error ? error.message : String(error);
      phase = 'transport reconnection';
      connection = retryNextDevelopmentServerOwnership(root, styleSheetFile);
      connectionByRoot.set(root, connection);
      try {
        const ownership = await waitForNextDevelopmentServerBinding(root);
        if (ownership === 'owner') {
          phase = 'initial source scan';
          await startOwnerCoordinator(root, styleSheetFile, options, connection);
        }
      } catch (bindingError) {
        lastError = bindingError instanceof Error ? bindingError.message : String(bindingError);
        if (lastError.includes('could not own port')) {
          throw bindingError;
        }
      }
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
  }
  throw new Error(
    `CSSX Next.js development stylesheet did not become ready within 30 seconds (last phase: ${phase}; last error: ${lastError}).`,
  );
}

/** Converts coordinator setup errors into a status response loaders can surface immediately. */
async function startOwnerCoordinator(
  root: string,
  styleSheetFile: string,
  options: CssxPluginOptions,
  connection: NextDevelopmentHmrConnection,
): Promise<void> {
  try {
    await startDevelopmentCoordinator(root, styleSheetFile, options, connection, undefined, true);
  } catch (error) {
    await reportNextDevelopmentStartupStatus(connection, 'watcher setup', error).catch(() => undefined);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`CSSX Next.js stylesheet startup failed during watcher setup: ${message}`, { cause: error });
  }
}
