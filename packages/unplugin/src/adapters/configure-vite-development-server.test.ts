import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it, vi } from 'vitest';

import type { ModuleCssxData } from '../transforms/module-cssx-data';
import {
  compileViteDevelopmentStylesheet,
  configureViteDevelopmentServer,
  type ViteDevelopmentServerOptions,
  type ViteServerLike,
} from './configure-vite-development-server';

/** Captures middleware and watcher callbacks registered by Vite configuration. */
function createServerHarness(base?: string, root?: string) {
  type Middleware = Parameters<ViteServerLike['middlewares']['use']>[0];
  const registeredMiddlewares: Middleware[] = [];
  let unlink: ((path: string) => void) | undefined;
  const server: ViteServerLike = {
    config: { base, root },
    watcher: {
      on(_event, listener) {
        unlink = listener;
      },
    },
    middlewares: {
      use(handler) {
        registeredMiddlewares.push(handler);
      },
    },
  };
  return {
    server,
    unlink: (path: string) => unlink?.(path),
    middleware: () =>
      ((request, response, next) => {
        let index = 0;
        const run = () => {
          const middleware = registeredMiddlewares[index++];
          if (middleware) {
            middleware(request, response, run);
          } else {
            next();
          }
        };
        run();
      }) as Middleware,
  };
}

/** Invokes one registered middleware and collects its response or pass-through. */
async function requestMiddleware(
  middleware: NonNullable<ReturnType<ReturnType<typeof createServerHarness>['middleware']>>,
  url: string,
  options: {
    readonly headers?: Record<string, string>;
    readonly request?: { readonly method?: string; readonly headers?: { readonly accept?: string } };
  } = {},
) {
  const headers: Record<string, string> = Object.fromEntries(
    Object.entries(options.headers ?? {}).map(([name, value]) => [name.toLowerCase(), value]),
  );
  const chunks: string[] = [];
  let finish: (() => void) | undefined;
  let complete!: (value: {
    readonly headers: Record<string, string>;
    readonly body: string;
    readonly continued: boolean;
  }) => void;
  const response = {
    setHeader: (name: string, value: string) => (headers[name.toLowerCase()] = value),
    getHeader: (name: string) => headers[name.toLowerCase()],
    removeHeader: (name: string) => delete headers[name.toLowerCase()],
    write: (chunk: string | Uint8Array) => {
      chunks.push(typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString());
      return true;
    },
    on: () => undefined,
    once: (event: 'close' | 'finish', listener: () => void) => {
      if (event === 'finish') {
        finish = listener;
      }
      return response;
    },
    end: (chunk?: string | Uint8Array, _encoding?: unknown, callback?: () => void) => {
      if (chunk !== undefined) {
        chunks.push(typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString());
      }
      finish?.();
      if (typeof _encoding === 'function') {
        _encoding();
      } else {
        callback?.();
      }
      complete({ headers, body: chunks.join(''), continued: false });
      return response;
    },
  };
  return await new Promise<{
    readonly headers: Record<string, string>;
    readonly body: string;
    readonly continued: boolean;
  }>((resolve) => {
    complete = resolve;
    middleware({ url, ...options.request }, response as unknown as Parameters<typeof middleware>[1], () => {
      complete({ headers, body: chunks.join(''), continued: true });
    });
  });
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

it('serves CSS and source-map paths, streams stylesheet updates, and handles unlink', async () => {
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
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  expect(mapResponse.body).toBe('');
  const cssResponse = await requestMiddleware(middleware, '/app/cssx.css?v=1');
  expect(cssResponse.headers).toMatchObject({
    'content-type': 'text/css; charset=utf-8',
    'cache-control': 'no-store',
  });

  const streamHeaders: Record<string, string> = {};
  const streamWrites: string[] = [];
  middleware(
    { url: '/app/cssx.css.events' },
    {
      setHeader: (name: string, value: string) => (streamHeaders[name] = value),
      write: (chunk: string | Uint8Array) => {
        streamWrites.push(typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString());
        return true;
      },
      on() {},
      end() {
        return this;
      },
    } as unknown as Parameters<typeof middleware>[1],
    () => {
      throw new Error('The stylesheet event path should be handled by CSSX.');
    },
  );
  expect(streamHeaders['Content-Type']).toBe('text/event-stream; charset=utf-8');

  harness.unlink('/project/old.ts?vue');
  expect(rollupDataById.size).toBe(0);
  await expect.poll(() => streamWrites).toHaveLength(2);
  expect(JSON.parse(streamWrites[1]!.slice('data: '.length))).toMatchObject({
    css: '',
    revision: expect.any(Number),
  });
});

it('does not claim source-map requests when maps are disabled', async () => {
  const harness = createServerHarness();
  const getTheme = vi.fn(async () => undefined);
  configureViteDevelopmentServer(harness.server, configuration({ sourceMap: false, getTheme }));

  expect(await requestMiddleware(harness.middleware()!, '/cssx.css.map')).toMatchObject({ continued: true });
  expect(getTheme).not.toHaveBeenCalled();
});

it('scans the project when development CSS uses manifest coordination', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-vite-manifest-'));
  try {
    await mkdir(join(root, 'src'), { recursive: true });
    await writeFile(
      join(root, 'src', 'card.tsx'),
      "import { sx } from '@cssxio/cssx'; export const className = sx('p-4');",
    );
    const harness = createServerHarness(undefined, root);
    configureViteDevelopmentServer(
      harness.server,
      configuration({
        options: {
          naming: 'serial',
          coordination: 'manifest',
          manifestPath: join(root, '.cssx', 'classnames.json'),
          preflight: false,
        },
      }),
    );

    const response = await requestMiddleware(harness.middleware()!, '/cssx.css');
    expect(response.body).toContain('.s0x{padding:calc(0.25rem * 4);}');

    const previousCwd = process.cwd();
    process.chdir(root);
    try {
      const cwdHarness = createServerHarness();
      configureViteDevelopmentServer(
        cwdHarness.server,
        configuration({
          options: {
            naming: 'serial',
            coordination: 'manifest',
            manifestPath: join(root, '.cssx', 'classnames.json'),
            preflight: false,
          },
        }),
      );
      expect((await requestMiddleware(cwdHarness.middleware()!, '/cssx.css')).body).toContain(
        '.s0x{padding:calc(0.25rem * 4);}',
      );
    } finally {
      process.chdir(previousCwd);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

it('returns compiler errors as text and handles non-Error rejection values', async () => {
  const errorHarness = createServerHarness();
  configureViteDevelopmentServer(
    errorHarness.server,
    configuration({ getTheme: async () => Promise.reject(new Error('theme unavailable')) }),
  );
  const errorResponse = await requestMiddleware(errorHarness.middleware()!, '/cssx.css');
  expect(errorResponse.headers['content-type']).toBe('text/plain; charset=utf-8');
  expect(errorResponse.body).toBe('theme unavailable');

  const valueHarness = createServerHarness();
  configureViteDevelopmentServer(
    valueHarness.server,
    configuration({ getTheme: () => Promise.reject('failed theme') }),
  );
  const valueResponse = await requestMiddleware(valueHarness.middleware()!, '/cssx.css');
  expect(valueResponse.body).toBe('Unable to compile CSSX development stylesheet.');
});

it('reports stylesheet compilation failures triggered by Vite file deletion', async () => {
  const harness = createServerHarness();
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  configureViteDevelopmentServer(
    harness.server,
    configuration({ getTheme: () => Promise.reject(new Error('invalid theme after unlink')) }),
  );

  try {
    harness.unlink('/project/deleted.ts');
    await vi.waitFor(() => expect(warning).toHaveBeenCalledWith(expect.stringContaining('invalid theme after unlink')));

    const nonErrorHarness = createServerHarness();
    configureViteDevelopmentServer(
      nonErrorHarness.server,
      configuration({ getTheme: () => Promise.reject('string theme failure') }),
    );
    nonErrorHarness.unlink('/project/other.ts');
    await vi.waitFor(() => expect(warning).toHaveBeenCalledWith(expect.stringContaining('string theme failure')));
  } finally {
    warning.mockRestore();
  }
});

it('resolves manifest stylesheet scans from the working directory when no root is configured', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-vite-manifest-cwd-'));
  const previousCwd = process.cwd();
  try {
    await mkdir(join(root, 'src'), { recursive: true });
    await writeFile(
      join(root, 'src', 'page.tsx'),
      "import { sx } from '@cssxio/cssx'; export const className = sx('p-4');",
    );
    process.chdir(root);
    const compiled = await compileViteDevelopmentStylesheet(
      configuration({
        options: {
          naming: 'serial',
          coordination: 'manifest',
          manifestPath: join(root, '.cssx', 'classes.json'),
          preflight: false,
        },
      }),
    );
    expect(compiled.css).toContain('padding:calc(0.25rem * 4)');
  } finally {
    process.chdir(previousCwd);
    await rm(root, { recursive: true, force: true });
  }
});
