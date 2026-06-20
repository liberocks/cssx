import { Buffer } from 'node:buffer';
import { mkdir, readFile, realpath, unlink, writeFile } from 'node:fs/promises';
import { basename, dirname, isAbsolute, normalize, resolve, sep } from 'node:path';
import type { Loader, Plugin } from 'esbuild';
import { createClassNameAllocator } from '@cssxio/compiler';
import { compileCssxStylesheet, transformCssxModule } from './index';
import type { CssxPluginOptions } from './index';
import type { CssxSourceModule } from './stylesheet';

/** Matches JavaScript and TypeScript source files handled by esbuild. */
const SCRIPT_ID = /\.[cm]?[jt]sx?$/;

/**
 * Creates the CSSX adapter for esbuild. It enables the metafile, transforms matching source files,
 * then emits CSS after esbuild finishes. With `write: false`, CSS and its source map are added to
 * `outputFiles`; otherwise they are written beside esbuild's configured output.
 *
 * @param options Adapter options.
 * @returns An esbuild plugin.
 */
export default function cssxEsbuild(options: CssxPluginOptions = {}): Plugin {
  /** Candidate data indexed by canonical source path for the current build. */
  const dataById = new Map<string, CssxSourceModule>();
  /** Serial namespace shared by all transformed modules in this esbuild plugin instance. */
  const classNameAllocator = createClassNameAllocator();
  /** CSS asset written by the previous build, used to remove stale output. */
  let emittedAsset: string | undefined;
  /** CSS source map written by the previous build, used to remove stale output. */
  let emittedMapAsset: string | undefined;
  return {
    name: '@cssxio/unplugin',
    setup(build) {
      const workingDirectory = build.initialOptions.absWorkingDir ?? process.cwd();
      build.initialOptions.metafile = true;
      build.onLoad({ filter: SCRIPT_ID }, async ({ path }) => {
        const code = await readFile(path, 'utf8');
        const transformed = await transformCssxModule(code, path, { ...options, classNameAllocator });
        if (!transformed) {
          return undefined;
        }
        const id = await canonicalPath(path);
        dataById.set(id, {
          id,
          candidates: transformed.candidates,
          composites: transformed.composites,
          atomicClasses: transformed.atomicClasses,
          origins: transformed.origins,
        });
        return { contents: transformed.code, loader: loaderFor(path) };
      });
      build.onEnd(async (result) => {
        if (!result.metafile) {
          return;
        }
        const liveIds = new Set(
          await Promise.all(
            Object.keys(result.metafile.inputs).map((id) => canonicalPath(resolve(workingDirectory, id))),
          ),
        );
        for (const id of dataById.keys()) {
          if (!liveIds.has(id)) {
            dataById.delete(id);
          }
        }
        const compiled = await compileCss([...dataById], options);
        const assetPath = resolveAssetPath(
          workingDirectory,
          build.initialOptions,
          resolveCssFileName(options.cssFileName ?? 'cssx.css', compiled.css),
        );
        if (!compiled.css) {
          if (emittedAsset) {
            await unlink(emittedAsset).catch(() => undefined);
          }
          if (emittedMapAsset) {
            await unlink(emittedMapAsset).catch(() => undefined);
          }
          emittedAsset = undefined;
          emittedMapAsset = undefined;
          return;
        }
        const css = compiled.map ? `${compiled.css}\n/*# sourceMappingURL=${basename(assetPath)}.map */` : compiled.css;
        const mapPath = `${assetPath}.map`;
        const map = compiled.map ? JSON.stringify({ ...compiled.map, file: basename(assetPath) }) : undefined;
        if (build.initialOptions.write === false) {
          if (!result.outputFiles) {
            return;
          }
          if (result.outputFiles.some((file) => file.path === assetPath)) {
            throw new Error(`CSSX CSS asset collision at "${assetPath}".`);
          }
          result.outputFiles.push({ path: assetPath, contents: Buffer.from(css), hash: '', text: css });
          if (map) {
            result.outputFiles.push({ path: mapPath, contents: Buffer.from(map), hash: '', text: map });
          }
          return;
        }
        await mkdir(dirname(assetPath), { recursive: true });
        await writeFile(assetPath, css);
        if (map) {
          await writeFile(mapPath, map);
        }
        emittedAsset = assetPath;
        emittedMapAsset = map ? mapPath : undefined;
      });
    },
  };
}

/**
 * Compiles candidate data collected by esbuild into a stylesheet.
 *
 * @param modules Candidate data indexed by canonical source path.
 * @param options Adapter options that provide the theme and CSS layer.
 * @returns A promise for the generated stylesheet and optional source map.
 */
async function compileCss(
  modules: readonly (readonly [string, CssxSourceModule])[],
  options: CssxPluginOptions,
): ReturnType<typeof compileCssxStylesheet> {
  const theme = options.themeFile ? await readFile(resolve(process.cwd(), options.themeFile), 'utf8') : options.theme;
  return compileCssxStylesheet(
    modules.map(([, data]) => data),
    theme,
    options.layer,
    options.sourceMap ?? true,
  );
}

/**
 * Selects the esbuild loader for a source file.
 *
 * @param id Source file path.
 * @returns The esbuild JavaScript or TypeScript loader.
 */
