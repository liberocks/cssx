import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { loadTheme } from '../core/load-theme';
import type { CssxPluginOptions } from '../core/options';
import type { CssxSourceModule } from '../native/stylesheet';
import { cssSourceMap } from '../source-map/css-source-map';
import { cssWithSourceMapComment } from '../source-map/css-with-source-map-comment';
import { compileCssxStylesheet } from '../transforms/compile-cssx-stylesheet';
import {
  releaseProjectScan,
  retainProjectScan,
  scanProjectCssxSourceModules,
  watchProjectCssxSourceModules,
} from '../transforms/project-scan';
import { publishNextDevelopmentStylesheet, reportNextDevelopmentStartupStatus } from './next-development-server';
import type { NextDevelopmentHmrConnection } from './next-development-server';

/** Active metadata coordinator startup and cleanup by project root. */
const coordinators = new Map<string, Promise<() => void>>();

/** Initializes the cached dev stylesheet and watches only directories with CSSX sources. */
export function startDevelopmentCoordinator(
  root: string,
  styleSheetFile: string,
  options: CssxPluginOptions,
  connection: NextDevelopmentHmrConnection,
  isHandledByBundler?: (path: string) => boolean,
  recoverStartupFailure = false,
): Promise<() => void> {
  const projectRoot = resolve(root);
  const existing = coordinators.get(projectRoot);
  if (existing) {
    return existing;
  }

  const startup = (async () => {
    retainProjectScan(projectRoot, options);
    let stopWatcher: (() => void) | undefined;
    let latestCss: string | undefined;
    const updateStylesheet = async (updatedModules: readonly CssxSourceModule[]) => {
      try {
        if (latestCss === undefined) {
          const completeModules = await scanProjectCssxSourceModules(projectRoot, options);
          const css = await writeNextDevelopmentStylesheet(
            projectRoot,
            styleSheetFile,
            options,
            completeModules,
            recoverStartupFailure,
          );
          await publishNextDevelopmentStylesheet(connection, css);
          latestCss = css;
          return;
        }
        const theme = await loadTheme(options, projectRoot);
        const stylesheet = await compileCssxStylesheet(
          updatedModules,
          theme,
          options.layer,
          options.sourceMap,
          options.darkMode,
          options.preflight,
        );
        const css = developmentStylesheetCss(stylesheet, recoverStartupFailure);
        if (css !== latestCss) {
          await publishNextDevelopmentStylesheet(connection, css);
          latestCss = css;
        }
      } catch (error) {
        if (recoverStartupFailure && latestCss === undefined) {
          await reportNextDevelopmentStartupStatus(connection, 'initial stylesheet compilation', error).catch(
            () => undefined,
          );
        }
        throw error;
      }
    };
    let startupPhase = 'initial source scan';
    try {
      if (recoverStartupFailure) {
        await reportNextDevelopmentStartupStatus(connection, startupPhase).catch(() => undefined);
      }
      const modules = await scanProjectCssxSourceModules(projectRoot, options);
      startupPhase = 'initial stylesheet compilation';
      const css = await writeNextDevelopmentStylesheet(
        projectRoot,
        styleSheetFile,
        options,
        modules,
        recoverStartupFailure,
      );
      await publishNextDevelopmentStylesheet(connection, css);
      latestCss = css;
    } catch (error) {
      if (recoverStartupFailure) {
        await reportNextDevelopmentStartupStatus(connection, startupPhase, error).catch(() => undefined);
      }
      if (!recoverStartupFailure) {
        releaseProjectScan(projectRoot, options);
        throw error;
      }
    }
    try {
      stopWatcher = await watchProjectCssxSourceModules(
        projectRoot,
        options,
        updateStylesheet,
        isHandledByBundler,
        recoverStartupFailure && latestCss === undefined,
      );
      let stopped = false;
      return () => {
        if (stopped) {
          return;
        }
        stopped = true;
        stopWatcher?.();
        releaseProjectScan(projectRoot, options);
        coordinators.delete(projectRoot);
      };
    } catch (error) {
      stopWatcher?.();
      releaseProjectScan(projectRoot, options);
      throw error;
    }
  })();
  coordinators.set(projectRoot, startup);
  void startup.catch((error: unknown) => {
    console.warn(
      `CSSX: Next development coordinator could not start: ${error instanceof Error ? error.message : String(error)}`,
    );
    coordinators.delete(projectRoot);
  });
  return startup;
}

/** Compiles the ordered stylesheet from cached metadata and preserves the last good output. */
export async function writeNextDevelopmentStylesheet(
  root: string,
  styleSheetFile: string,
  options: CssxPluginOptions,
  modules: readonly CssxSourceModule[],
  includeStylesheetHash = false,
): Promise<string> {
  const theme = await loadTheme(options, root);
  const stylesheet = await compileCssxStylesheet(
    modules,
    theme,
    options.layer,
    options.sourceMap,
    options.darkMode,
    options.preflight,
  );
  await mkdir(dirname(styleSheetFile), { recursive: true });
  const css = developmentStylesheetCss(stylesheet, includeStylesheetHash);
  await writeAtomicallyIfChanged(styleSheetFile, css);
  if (stylesheet.map) {
    await writeAtomicallyIfChanged(`${styleSheetFile}.map`, cssSourceMap(stylesheet.map, 'generated.css'));
  }
  return css;
}

/** Adds a stable marker to Next development output so the browser can detect already loaded CSS. */
function developmentStylesheetCss(
  stylesheet: Awaited<ReturnType<typeof compileCssxStylesheet>>,
  includeStylesheetHash: boolean,
): string {
  if (!includeStylesheetHash) {
    return cssWithSourceMapComment(stylesheet, 'generated.css');
  }
  const hash = createHash('sha256').update(stylesheet.css).digest('hex').slice(0, 16);
  return cssWithSourceMapComment(
    { ...stylesheet, css: `${stylesheet.css}\n:root{--cssx-dev-stylesheet-hash:${hash};}` },
    'generated.css',
  );
}

/** Atomically replaces one generated file only when its contents change. */
async function writeAtomicallyIfChanged(fileName: string, contents: string): Promise<boolean> {
  try {
    if ((await readFile(fileName, 'utf8')) === contents) {
      return false;
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
  const temporaryFile = `${fileName}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporaryFile, contents);
    await rename(temporaryFile, fileName);
    return true;
  } catch (error) {
    await unlink(temporaryFile).catch(() => undefined);
    throw error;
  }
}
