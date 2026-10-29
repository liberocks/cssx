import type { CssxPluginOptions } from '../core/options';
import { moduleId, viteCssPath } from '../core/options';
import { compileCssxStylesheet, cssSourceMap, cssWithSourceMapComment } from '../native/stylesheet';
import type { ModuleCssxData } from '../transforms/module-cssx-data';
import { scanProjectCssxSourceModules } from '../transforms/project-scan';
import { connectViteStylesheetClient, sendViteStyles } from './vite-dev';
import { createViteDevelopmentHtmlHmrMiddleware } from './vite-html-hmr';
import type { ViteHtmlRequestLike, ViteHtmlResponseLike } from './vite-html-hmr';

/** HTTP response surface shared by Vite's event and SSR bridge middlewares. */
interface ViteDevelopmentServerResponse extends ViteHtmlResponseLike {
  on(event: 'close', listener: () => void): unknown;
  setHeader(name: string, value: string): void;
}

/** Development server APIs used to serve and refresh the in-memory stylesheet. */
export interface ViteServerLike {
  /** Server configuration used to determine the base URL. */
  readonly config: { readonly base?: string; readonly root?: string };
  /** Optional file watcher used to remove deleted modules. */
  readonly watcher?: {
    /** Registers listeners for normalized and backend-level file events. */
    on(event: string, listener: (...args: any[]) => void): unknown;
  };
  /** Middleware stack that serves the development stylesheet and source map. */
  readonly middlewares: {
    /** Adds one development server middleware handler. */
    use(
      handler: (request: ViteHtmlRequestLike, response: ViteDevelopmentServerResponse, next: () => void) => void,
    ): void;
  };
}

/** Configuration captured by the Vite development server. */
export interface ViteDevelopmentServerOptions {
  /** Relative stylesheet output path. */
  readonly cssFileName: string;
  /** Project root used for project-wide scans. */
  readonly root?: string;
  /** Whether a stylesheet source map is served. */
  readonly sourceMap: boolean;
  /** CSSX compiler options used to generate the development stylesheet. */
  readonly options: CssxPluginOptions;
  /** Transformed module data retained while the server is running. */
  readonly rollupDataById: Map<string, ModuleCssxData>;
  /** Loads the active theme source. */
  readonly getTheme: () => Promise<string | undefined>;
}

/** Registers the stylesheet-serving middleware and deleted-module watcher. */
export function configureViteDevelopmentServer(
  server: ViteServerLike,
  configuration: ViteDevelopmentServerOptions,
): void {
  const { cssFileName, sourceMap, rollupDataById } = configuration;
  const cssPath = viteCssPath(server.config.base, cssFileName);
  const eventsPath = `${cssPath}.events`;
  server.watcher?.on('unlink', (path) => {
    rollupDataById.delete(moduleId(path));
    void compileViteDevelopmentStylesheet({ ...configuration, root: server.config.root ?? process.cwd() })
      .then((stylesheet) => sendViteStyles(server, cssWithSourceMapComment(stylesheet, cssFileName)))
      .catch((error: unknown) => {
        console.warn(`CSSX: Vite stylesheet update failed: ${error instanceof Error ? error.message : String(error)}`);
      });
  });
  server.middlewares.use((request, response, next) => {
    const pathname = request.url?.split('?', 1)[0];
    if (pathname === eventsPath) {
      connectViteStylesheetClient(server, response);
      return;
    }
    if (pathname !== cssPath && (pathname !== `${cssPath}.map` || !sourceMap)) {
      return next();
    }
    void compileViteDevelopmentStylesheet({ ...configuration, root: server.config.root ?? process.cwd() })
      .then((compiled) => {
        if (pathname === `${cssPath}.map`) {
          response.setHeader('Content-Type', 'application/json; charset=utf-8');
          response.setHeader('Cache-Control', 'no-store');
          response.end(compiled.map ? cssSourceMap(compiled.map, cssFileName) : '');
          return;
        }
        response.setHeader('Content-Type', 'text/css; charset=utf-8');
        response.setHeader('Cache-Control', 'no-store');
        response.end(cssWithSourceMapComment(compiled, cssFileName));
      })
      .catch((error: unknown) => {
        response.setHeader('Content-Type', 'text/plain; charset=utf-8');
        response.end(error instanceof Error ? error.message : 'Unable to compile CSSX development stylesheet.');
      });
  });
  server.middlewares.use(createViteDevelopmentHtmlHmrMiddleware(cssFileName, server.config.base ?? '/'));
}

/** Compiles the complete stylesheet from cached metadata for a push or stylesheet request. */
export async function compileViteDevelopmentStylesheet(
  configuration: ViteDevelopmentServerOptions,
): Promise<Awaited<ReturnType<typeof compileCssxStylesheet>>> {
  const { options, rollupDataById, getTheme } = configuration;
  const theme = await getTheme();
  const sourceData =
    options.coordination === 'manifest'
      ? await scanProjectCssxSourceModules(configuration.root ?? process.cwd(), options)
      : [...rollupDataById.values()];
  return compileCssxStylesheet(
    sourceData,
    theme,
    options.layer,
    configuration.sourceMap,
    options.darkMode,
    options.preflight,
  );
}
