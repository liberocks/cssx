import { expect, it, vi } from 'vitest';

import {
  configureViteDevelopmentServer,
  type ViteDevelopmentServerOptions,
  type ViteServerLike,
} from './configure-vite-development-server';
import type { ModuleCssxData } from './module-cssx-data';

/** Captures middleware and watcher callbacks registered by Vite configuration. */
function createServerHarness(base?: string) {
  let middleware:
    | ((
        request: { readonly url?: string },
        response: { setHeader(name: string, value: string): void; end(body?: string): void },
        next: () => void,
      ) => void)
    | undefined;
  let unlink: ((path: string) => void) | undefined;
  const updates: unknown[] = [];
  const server: ViteServerLike = {
    config: { base },
    watcher: {
      on(_event, listener) {
        unlink = listener;
      },
    },
    middlewares: {
      use(handler) {
        middleware = handler;
      },
    },
    ws: { send: (update) => updates.push(update) },
  };
  return {
    server,
    updates,
    unlink: (path: string) => unlink?.(path),
    middleware: () => middleware,
  };
}

/** Invokes one registered middleware and collects its response or pass-through. */
async function requestMiddleware(
  middleware: NonNullable<ReturnType<ReturnType<typeof createServerHarness>['middleware']>>,
  url: string,
) {
  const headers: Record<string, string> = {};
  let body: string | undefined;
  let continued = false;
  await new Promise<void>((resolve) =>
    middleware(
      { url },
      {
        setHeader: (name, value) => (headers[name] = value),
        end: (value) => {
          body = value;
          resolve();
        },
      },
      () => {
        continued = true;
        resolve();
      },
    ),
  );
  return { headers, body, continued };
}

/** Creates minimal settings for direct middleware tests. */
function configuration(overrides: Partial<ViteDevelopmentServerOptions> = {}): ViteDevelopmentServerOptions {
  return {
    cssFileName: 'cssx.css',
    sourceMap: true,
    options: { preflight: false },
    rollupDataById: new Map(),
    getTheme: async () => undefined,
    ...overrides,
  };
}

it('serves CSS and source-map paths, passes other requests through, and notifies on unlink', async () => {
  const harness = createServerHarness('/app/');
  const oldModule: ModuleCssxData = {
    id: '/project/old.ts',
    rules: [],
    candidates: {},
    composites: {},
    origins: {},
    cssOnlySignature: '',
    atomicClasses: [],
  };
  const rollupDataById = new Map([[oldModule.id, oldModule]]);
  configureViteDevelopmentServer(harness.server, configuration({ rollupDataById }));
  const middleware = harness.middleware()!;

  expect(await requestMiddleware(middleware, '/other.css')).toMatchObject({ continued: true });
  const mapResponse = await requestMiddleware(middleware, '/app/cssx.css.map');
  expect(mapResponse.headers).toMatchObject({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  expect(mapResponse.body).toBe('');
  const cssResponse = await requestMiddleware(middleware, '/app/cssx.css?v=1');
  expect(cssResponse.headers).toMatchObject({
    'Content-Type': 'text/css; charset=utf-8',
    'Cache-Control': 'no-store',
  });

  harness.unlink('/project/old.ts?vue');
  expect(rollupDataById.size).toBe(0);
  expect(harness.updates).toEqual([
    {
      type: 'update',
      updates: [{ type: 'css-update', path: '/cssx.css', acceptedPath: '/cssx.css', timestamp: expect.any(Number) }],
    },
  ]);
});

it('does not claim source-map requests when maps are disabled', async () => {
  const harness = createServerHarness();
  const getTheme = vi.fn(async () => undefined);
  configureViteDevelopmentServer(harness.server, configuration({ sourceMap: false, getTheme }));

  expect(await requestMiddleware(harness.middleware()!, '/cssx.css.map')).toMatchObject({ continued: true });
  expect(getTheme).not.toHaveBeenCalled();
});

it('returns compiler errors as text and handles non-Error rejection values', async () => {
  const errorHarness = createServerHarness();
  configureViteDevelopmentServer(
    errorHarness.server,
    configuration({ getTheme: async () => Promise.reject(new Error('theme unavailable')) }),
  );
  const errorResponse = await requestMiddleware(errorHarness.middleware()!, '/cssx.css');
  expect(errorResponse.headers['Content-Type']).toBe('text/plain; charset=utf-8');
  expect(errorResponse.body).toBe('theme unavailable');

  const valueHarness = createServerHarness();
  configureViteDevelopmentServer(
    valueHarness.server,
    configuration({ getTheme: () => Promise.reject('failed theme') }),
  );
  const valueResponse = await requestMiddleware(valueHarness.middleware()!, '/cssx.css');
  expect(valueResponse.body).toBe('Unable to compile CSSX development stylesheet.');
});
