import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';

import { compileCssxStylesheet } from './compile-cssx-stylesheet';
import { createCssxDebugReport } from './create-debug-report';
import { cssSourceMap } from './css-source-map';
import { cssWithSourceMapComment } from './css-with-source-map-comment';
import { findProjectSourceFiles } from './find-project-source-files';
import { compileNextMdx, type CssxNextMdxOptions } from './next-mdx';
import type { CssxPluginOptions } from './options';
import { effectiveClassNameOptions } from './options';
import { scanProjectCssxSourceModules } from './project-scan';
import type { IncomingSourceMap } from './source-map-from-context';
import { transformCssxModule } from './transform';
import { withClassNameManifest } from './with-class-name-manifest';

/** JSON-safe options passed by the Next.js config wrapper to this loader. */
export interface CssxNextLoaderOptions {
  readonly projectRoot: string;
  readonly styleSheetFile: string;
  readonly importSource: string;
  readonly manifestPath: string;
  readonly development: boolean;
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

/** Transforms one module and refreshes generated CSS when processing the root layout. */
async function runLoader(
  context: CssxLoaderContext,
  source: string,
  inputMap?: IncomingSourceMap,
): Promise<{ readonly code: string; readonly map?: IncomingSourceMap }> {
  const settings = context.getOptions();
  const root = resolve(settings.projectRoot || context.rootContext || process.cwd());
  const absoluteId = resolve(context.resourcePath);
  const extension = absoluteId.slice(absoluteId.lastIndexOf('.')).toLowerCase();
  let code = source;
  if (MDX_EXTENSIONS.has(extension)) {
    code = await compileNextMdx(source, root, settings.mdx);
  }

  const relativeId = relative(root, absoluteId).replaceAll(sep, '/');
  const stable = settings.cssx.naming === 'source' || settings.cssx.stableClassNames === true;
  const transformOptions = {
    ...settings.cssx,
    className: effectiveClassNameOptions(settings.cssx),
    stableClassNames: stable,
    ...(stable ? { stableClassNameFileName: relativeId } : {}),
  };
  const transformed = await withClassNameManifest(
    settings.manifestPath,
    transformOptions.className,
    async (allocator) => {
      const babelId = MDX_EXTENSIONS.has(extension) ? `${absoluteId}.tsx` : absoluteId;
      return transformCssxModule(code, babelId, { ...transformOptions, classNameAllocator: allocator }, inputMap);
    },
  );
  let output = transformed?.code ?? code;
  let outputMap = transformed?.map ?? inputMap;

  const isRootLayout = isRootAppLayout(relativeId);
  if (isRootLayout) {
    const sourceRoots = settings.cssx.sourceRoots?.map((path) => resolve(root, path)) ?? [];
    const files = await findProjectSourceFiles(root, sourceRoots);
    for (const file of files) {
      context.addDependency(file);
    }
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
  if (isRootLayout || (settings.development && source.includes(settings.importSource))) {
    const modules = await scanProjectCssxSourceModules(root, {
      ...settings.cssx,
      coordination: 'manifest',
      manifestPath: settings.manifestPath,
    });
    const theme = settings.cssx.themeFile
      ? await readFile(resolve(root, settings.cssx.themeFile), 'utf8')
      : settings.cssx.theme;
    if (settings.cssx.themeFile) {
      context.addDependency(resolve(root, settings.cssx.themeFile));
    }
    const stylesheet = await compileCssxStylesheet(
      modules,
      theme,
      settings.cssx.layer,
      settings.cssx.sourceMap,
      settings.cssx.darkMode,
      settings.cssx.preflight,
    );
    if (settings.cssx.debug) {
      const report = createCssxDebugReport(modules, stylesheet.css, {
        ...settings.cssx,
        coordination: 'manifest',
        manifestPath: settings.manifestPath,
      });
      if (settings.cssx.debug === true) {
        console.info(
          `CSSX: ${report.naming.mode} naming; ${report.classes.filter((item) => item.selectorFound).length}/${report.classes.length} generated classes have selectors; compiler mappings ${report.serverClientMappings.status}${report.serverClientMappings.conflicts.length ? ` (${report.serverClientMappings.conflicts.length} utility conflicts)` : ''}.`,
        );
      } else {
        const reportPath = resolve(root, settings.cssx.debug.reportFile);
        await mkdir(dirname(reportPath), { recursive: true });
        await writeIfChanged(reportPath, `${JSON.stringify(report, null, 2)}\n`);
      }
    }
    await mkdir(dirname(settings.styleSheetFile), { recursive: true });
    const contents = cssWithSourceMapComment(stylesheet, 'generated.css');
    await writeIfChanged(settings.styleSheetFile, contents);
    if (stylesheet.map) {
      await writeIfChanged(`${settings.styleSheetFile}.map`, cssSourceMap(stylesheet.map, 'generated.css'));
    }
  }
  if (isRootLayout) {
    const stylesheetImport = relative(dirname(absoluteId), settings.styleSheetFile).replaceAll(sep, '/');
    output += `\nimport '${stylesheetImport.startsWith('.') ? stylesheetImport : `./${stylesheetImport}`}';\n`;
    outputMap = undefined;
  }
  return { code: output, ...(outputMap ? { map: outputMap } : {}) };
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
