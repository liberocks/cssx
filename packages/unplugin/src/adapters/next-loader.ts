import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';

import { createCssxDebugReport } from '../core/create-debug-report';
import type { CssxPluginOptions } from '../core/options';
import {
  developmentPluginOptions,
  effectiveClassNameOptions,
  productionClassNameOptions,
  loadTheme,
} from '../core/options';
import { stableModuleFileName } from '../core/stable-module-file-name';
import type { CssxSourceModule } from '../native/stylesheet';
import { withClassNameManifest } from '../native/with-class-name-manifest';
import { cssSourceMap } from '../source-map/css-source-map';
import { cssWithSourceMapComment } from '../source-map/css-with-source-map-comment';
import type { IncomingSourceMap } from '../source-map/source-map-from-context';
import { compileCssxStylesheet } from '../transforms/compile-cssx-stylesheet';
import { isIgnoredProjectSourcePath } from '../transforms/find-project-source-files';
import {
  getCachedProjectScanSourceModules,
  getProjectScanClassNameAllocator,
  scanProjectCssxSourceModules,
  updateProjectScanModule,
} from '../transforms/project-scan';
import { transformCssxModule } from '../transforms/transform';
import type { NextDevelopmentHmrConnection } from './next-development-server';
import { compileNextMdx, type CssxNextMdxOptions } from './next-mdx';

/** JSON-safe options passed by the Next.js config wrapper to this loader. */
export interface CssxNextLoaderOptions {
  readonly projectRoot: string;
  readonly styleSheetFile: string;
  readonly importSource: string;
  readonly manifestPath: string;
  readonly development: boolean;
  readonly developmentHmr?: NextDevelopmentHmrConnection;
  readonly cssx: Omit<CssxPluginOptions, 'classNameAllocator' | 'coordination' | 'manifestPath'>;
  readonly mdx?: CssxNextMdxOptions;
}

/** Minimal Webpack/Turbopack loader context used by the shared loader. */
interface CssxLoaderContext {
  readonly resourcePath: string;
  readonly rootContext?: string;
  async(): (error: Error | null, source?: string, map?: IncomingSourceMap) => void;
  getOptions(): CssxNextLoaderOptions;
  addDependency(fileName: string): void;
  addContextDependency(directory: string): void;
}

/** Source extensions compiled through the MDX pipeline. */
const MDX_EXTENSIONS = new Set(['.md', '.mdx']);

/**
 * Next.js loader shared by Webpack and Turbopack.
 *
 * @param source Current source module.
 * @param inputMap Existing source map from an earlier loader.
 * @returns Nothing; follows the webpack loader callback contract.
 */
export default function cssxNextLoader(this: CssxLoaderContext, source: string, inputMap?: IncomingSourceMap): void {
  const callback = this.async();
  void runLoader(this, source, inputMap).then(
    ({ code, map }) => callback(null, code, map),
    (error: unknown) => callback(error instanceof Error ? error : new Error(String(error))),
  );
}

/** Transforms one module and refreshes generated CSS from the watched root layout. */
async function runLoader(
  context: CssxLoaderContext,
  source: string,
  inputMap?: IncomingSourceMap,
): Promise<{ readonly code: string; readonly map?: IncomingSourceMap }> {
  const settings = context.getOptions();
  const root = resolve(settings.projectRoot || context.rootContext || process.cwd());
  const absoluteId = resolve(context.resourcePath);
  const additionalRoots = settings.cssx.sourceRoots?.map((path) => resolve(root, path));
  if (isIgnoredProjectSourcePath(absoluteId, additionalRoots)) {
    return { code: source, ...(inputMap ? { map: inputMap } : {}) };
  }
  const extension = absoluteId.slice(absoluteId.lastIndexOf('.')).toLowerCase();
  let code = source;
  if (MDX_EXTENSIONS.has(extension)) {
    code = await compileNextMdx(source, root, settings.mdx);
  }

  const relativeId = relative(root, absoluteId).replaceAll(sep, '/');
  const isRootLayout = isRootAppLayout(relativeId);
  let developmentRuntime: typeof import('@cssxio/unplugin/internal/development-runtime') | undefined;
  const cssxOptions = settings.development ? developmentPluginOptions(settings.cssx) : settings.cssx;
  const stable = cssxOptions.naming === 'source' || cssxOptions.stableClassNames === true;
  const transformOptions = {
    ...cssxOptions,
    className: settings.development ? effectiveClassNameOptions(cssxOptions) : productionClassNameOptions(cssxOptions),
    stableClassNames: stable,
    ...(stable ? { stableClassNameFileName: stableModuleFileName(root, absoluteId, settings.development) } : {}),
  };
  const babelId = MDX_EXTENSIONS.has(extension) ? `${absoluteId}.tsx` : absoluteId;
  const transform = (allocator: import('@cssxio/compiler').ClassNameAllocator) =>
    transformCssxModule(code, babelId, { ...transformOptions, classNameAllocator: allocator }, inputMap, {
      compileCss: false,
    });
  const transformed = settings.development
    ? await transform(getProjectScanClassNameAllocator(root, cssxOptions))
    : await withClassNameManifest(settings.manifestPath, transformOptions.className, transform);
  if (settings.development && !isRootLayout && !settings.developmentHmr) {
    const cachedModules = getCachedProjectScanSourceModules(root, cssxOptions);
    const updated = await updateProjectScanModule(root, absoluteId, cssxOptions, transformed, source);
    if (updated || !cachedModules) {
      const modules =
        getCachedProjectScanSourceModules(root, cssxOptions) ?? (await scanProjectCssxSourceModules(root, cssxOptions));
      await writeNextStylesheet(root, settings.styleSheetFile, cssxOptions, cssxOptions, modules);
    }
  }
  let output = transformed?.code ?? code;
  let outputMap = transformed?.map ?? inputMap;
  const coordinatedDevelopment = settings.development && settings.developmentHmr !== undefined;

  if (isRootLayout && coordinatedDevelopment) {
    developmentRuntime = await import('@cssxio/unplugin/internal/development-runtime');
    await developmentRuntime.waitForNextDevelopmentStylesheet(settings.developmentHmr!);
  }
  if (isRootLayout && !coordinatedDevelopment) {
    const sourceRoots = settings.cssx.sourceRoots?.map((path) => resolve(root, path)) ?? [];
    for (const sourceRoot of [
      resolve(root, 'app'),
      resolve(root, 'src'),
      resolve(root, 'pages'),
      resolve(root, 'components'),
      ...sourceRoots,
    ]) {
      try {
        if ((await stat(sourceRoot)).isDirectory()) {
          context.addContextDependency(sourceRoot);
        }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw error;
        }
      }
    }
  }
  if (isRootLayout && !coordinatedDevelopment) {
    const scanOptions = {
      ...cssxOptions,
      ...(!settings.development ? { className: transformOptions.className } : {}),
      ...(settings.development ? {} : { coordination: 'manifest' as const, manifestPath: settings.manifestPath }),
    };
    const modules = await scanProjectCssxSourceModules(root, {
      ...scanOptions,
    });
    if (cssxOptions.themeFile) {
      context.addDependency(resolve(root, cssxOptions.themeFile));
    }
    await writeNextStylesheet(root, settings.styleSheetFile, cssxOptions, scanOptions, modules);
  }
  if (isRootLayout) {
    const stylesheetImport = relative(dirname(absoluteId), settings.styleSheetFile).replaceAll(sep, '/');
    output += `\nimport '${stylesheetImport.startsWith('.') ? stylesheetImport : `./${stylesheetImport}`}';\n`;
    outputMap = undefined;
  }
  if (settings.development && settings.developmentHmr && transformed) {
    developmentRuntime ??= await import('@cssxio/unplugin/internal/development-runtime');
    output += `\n${developmentRuntime.nextDevelopmentStylesheetHmr(settings.developmentHmr, settings.styleSheetFile)}`;
  }
  return { code: output, ...(outputMap ? { map: outputMap } : {}) };
}

/** Compiles cached module metadata and retains the last successful sheet on errors. */
async function writeNextStylesheet(
  root: string,
  styleSheetFile: string,
  options: CssxPluginOptions,
  reportOptions: CssxPluginOptions,
  modules: readonly CssxSourceModule[],
): Promise<void> {
  const theme = await loadTheme(options, root);
  const stylesheet = await compileCssxStylesheet(
    modules,
    theme,
    options.layer,
    options.sourceMap,
    options.darkMode,
    options.preflight,
  );
  if (options.debug) {
    const report = createCssxDebugReport(modules, stylesheet.css, reportOptions);
    if (options.debug === true) {
      console.info(
        `CSSX: ${report.naming.mode} naming; ${report.classes.filter((item) => item.selectorFound).length}/${report.classes.length} generated classes have selectors; compiler mappings ${report.serverClientMappings.status}${report.serverClientMappings.conflicts.length ? ` (${report.serverClientMappings.conflicts.length} utility conflicts)` : ''}.`,
      );
    } else {
      const reportPath = resolve(root, options.debug.reportFile);
      await mkdir(dirname(reportPath), { recursive: true });
      await writeIfChanged(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    }
  }
  await mkdir(dirname(styleSheetFile), { recursive: true });
  await writeAtomicallyIfChanged(styleSheetFile, cssWithSourceMapComment(stylesheet, 'generated.css'));
  if (stylesheet.map) {
    await writeAtomicallyIfChanged(`${styleSheetFile}.map`, cssSourceMap(stylesheet.map, 'generated.css'));
  }
}

/** Replaces a generated stylesheet in one filesystem event for live browser clients. */
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

/** Returns whether the path is the App Router's root layout module. */
function isRootAppLayout(relativeId: string): boolean {
  return /^(?:src\/)?app\/layout\.[cm]?[jt]sx?$/.test(relativeId);
}

/** Writes generated output only when its contents have changed. */
async function writeIfChanged(path: string, contents: string): Promise<void> {
  try {
    if ((await readFile(path, 'utf8')) === contents) {
      return;
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
  await writeFile(path, contents, 'utf8');
}
