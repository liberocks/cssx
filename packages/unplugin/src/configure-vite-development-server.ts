import type { ModuleCssxData } from './module-cssx-data';
import type { CssxPluginOptions } from './options';
import { moduleId, viteCssPath } from './options';
import { compileCssxStylesheet, cssSourceMap, cssWithSourceMapComment } from './stylesheet';
import { sendViteStyles } from './vite-dev';

/** Development server APIs used to serve and refresh the in-memory stylesheet. */
export interface ViteServerLike {
  /** Server configuration used to determine the base URL. */
  readonly config: { readonly base?: string };
  /** Optional file watcher used to remove deleted modules. */
  readonly watcher?: {
    /** Registers a listener for a watched file event. */
    on(event: 'unlink', listener: (path: string) => void): unknown;
  };
  /** Middleware stack that serves the development stylesheet and source map. */
  readonly middlewares: {
    /** Adds one development server middleware handler. */
    use(
      handler: (
        request: { readonly url?: string },
        response: { setHeader(name: string, value: string): void; end(body?: string): void },
        next: () => void,
      ) => void,
    ): void;
  };
  /** WebSocket transport used to request stylesheet-link refreshes. */
  readonly ws: {
    /** Sends a native Vite stylesheet update. */
    send(payload: {
      /** Marks this as a standard Vite update. */
      readonly type: 'update';
      /** CSS asset update handled by Vite's browser client. */
      readonly updates: readonly {
        readonly type: 'css-update';
        readonly path: string;
        readonly acceptedPath: string;
        readonly timestamp: number;
      }[];
    }): void;
  };
}

/** Configuration captured by the Vite development-server middleware. */
export interface ViteDevelopmentServerOptions {
  /** Relative stylesheet output path. */
  readonly cssFileName: string;
  /** Whether a stylesheet source map is served. */
  readonly sourceMap: boolean;
  /** CSSX compiler options used to generate the development stylesheet. */
  readonly options: CssxPluginOptions;
  /** Transformed module data retained while the server is running. */
  readonly rollupDataById: Map<string, ModuleCssxData>;
  /** Loads the active theme source. */
  readonly getTheme: () => Promise<string | undefined>;
}

/**
 * Registers the stylesheet-serving middleware and deleted-module watcher.
 *
 * @param server Vite development server receiving the middleware.
 * @param configuration Values captured by one plugin instance.
 */
export function configureViteDevelopmentServer(
  server: ViteServerLike,
  configuration: ViteDevelopmentServerOptions,
): void {
  const { cssFileName, sourceMap, options, rollupDataById, getTheme } = configuration;
  const cssPath = viteCssPath(server.config.base, cssFileName);
  const hmrPath = viteCssPath('/', cssFileName);
  server.watcher?.on('unlink', (path) => {
    rollupDataById.delete(moduleId(path));
    sendViteStyles(server, hmrPath);
  });
  server.middlewares.use((request, response, next) => {
    const pathname = request.url?.split('?', 1)[0];
    if (pathname !== cssPath && (pathname !== `${cssPath}.map` || !sourceMap)) {
      return next();
    }
    void getTheme()
      .then((theme) =>
        compileCssxStylesheet(
          [...rollupDataById.values()],
          theme,
          options.layer,
          sourceMap,
          options.darkMode,
          options.preflight,
        ),
      )
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
}
