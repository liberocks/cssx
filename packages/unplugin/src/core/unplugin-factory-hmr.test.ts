import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';

import { unpluginFactory } from './unplugin-factory';

const mocks = vi.hoisted(() => ({
  coordinator: vi.fn(),
  serverConnection: { value: { port: 45684, token: 'factory-test' } as { port: number; token: string } | undefined },
  startServer: vi.fn(() => mocks.serverConnection.value),
  stopServer: vi.fn(),
  publishStyles: vi.fn().mockResolvedValue(undefined),
  compileViteStylesheet: vi.fn().mockResolvedValue({ css: '.dtest{}' }),
  rollupRuntimeCreationError: undefined as Error | undefined,
  readFileGate: undefined as Promise<void> | undefined,
  readStarted: undefined as (() => void) | undefined,
}));

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return {
    ...actual,
    readFile: async (...args: Parameters<typeof actual.readFile>) => {
      if (mocks.readFileGate) {
        mocks.readStarted?.();
        await mocks.readFileGate;
      }
      return actual.readFile(...args);
    },
  };
});

vi.mock('../adapters/configure-vite-development-server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../adapters/configure-vite-development-server')>();
  return { ...actual, compileViteDevelopmentStylesheet: mocks.compileViteStylesheet };
});

vi.mock('../adapters/development-coordinator', () => ({ startDevelopmentCoordinator: mocks.coordinator }));
vi.mock('../adapters/rollup-development-notifier', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../adapters/rollup-development-notifier')>();
  return {
    ...actual,
    createRollupDevelopmentRuntime: (...args: Parameters<typeof actual.createRollupDevelopmentRuntime>) => {
      if (mocks.rollupRuntimeCreationError) {
        throw mocks.rollupRuntimeCreationError;
      }
      return actual.createRollupDevelopmentRuntime(...args);
    },
  };
});
vi.mock('../adapters/next-development-server', () => ({
  publishNextDevelopmentStylesheet: mocks.publishStyles,
  startNextDevelopmentServer: mocks.startServer,
  stopNextDevelopmentServer: mocks.stopServer,
}));
afterEach(() => {
  vi.clearAllMocks();
  mocks.coordinator.mockReset();
  mocks.serverConnection.value = { port: 45684, token: 'factory-test' };
  mocks.startServer.mockReset().mockImplementation(() => mocks.serverConnection.value);
  mocks.publishStyles.mockReset().mockResolvedValue(undefined);
  vi.unstubAllEnvs();
  mocks.readFileGate = undefined;
  mocks.readStarted = undefined;
  mocks.rollupRuntimeCreationError = undefined;
});

it('pushes CSS only Vite updates and handles stale, deleted, and failed source updates', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-unplugin-vite-hmr-'));
  const id = join(root, 'styles.ts');
  let watcherClose: (() => void) | undefined;
  let watcherChange: ((path: string) => void) | undefined;
  let watcherUnlink: ((path: string) => void) | undefined;
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  const makePlugin = (options = {}) => unpluginFactory(options, { framework: 'vite', versions: {} } as never) as any;
  try {
    const beforeServer = makePlugin({ mode: 'development' });
    await beforeServer.transform.handler("import { sx } from '@cssxio/cssx'; export const className = sx('p-4');", id);
    await beforeServer.vite.hotUpdate.handler.call(
      { environment: { name: 'client', transformRequest: vi.fn() } },
      {
        modules: [{ id, url: '/styles.ts' }],
        read: async () => "import { sx } from '@cssxio/cssx'; export const className = sx('p-4');",
      },
    );

    const plugin = makePlugin();
    plugin.vite.configResolved({ command: 'serve', root });
    makePlugin().vite.configResolved({ command: 'serve' });
    await plugin.vite.configureServer({
      config: { root, base: '/' },
      watcher: {
        on(event: string, listener: (path?: string) => void) {
          if (event === 'close') {
            watcherClose = listener as () => void;
          }
          if (event === 'change') {
            watcherChange = listener as (path: string) => void;
          }
          if (event === 'unlink') {
            watcherUnlink = listener as (path: string) => void;
          }
        },
      },
      middlewares: { use() {} },
    });
    await plugin.vite.configureServer({
      config: { root, base: '/' },
      middlewares: { use() {} },
    });
    await plugin.transform.handler('export const plain = true;', join(root, 'plain.ts'));
    await plugin.transform.handler(
      "import { create } from '@cssxio/cssx'; export const styles = create({});",
      join(root, 'empty.ts'),
    );
    await expect(
      plugin.transform.handler(
        "import { sx } from '@cssxio/cssx'; export const className = sx('p-4');",
        join(root, '.open-next', 'generated.ts'),
      ),
    ).resolves.toBeNull();

    const css = (utility: string) => `import { sx } from '@cssxio/cssx'; export const className = sx('${utility}');`;
    await writeFile(id, css('p-4'));
    await plugin.transform.handler(css('p-4'), id);
    await plugin.watchChange(join(root, 'plain.ts'), { event: 'update' });

    await writeFile(id, css('p-8'));
    watcherChange?.(id);
    await vi.waitFor(() => expect(mocks.compileViteStylesheet).toHaveBeenCalled());
    const prepared = await plugin.vite.hotUpdate.handler.call(
      { environment: { name: 'client', transformRequest: vi.fn() } },
      { modules: [{ id, url: '/styles.ts' }], read: async () => css('p-8') },
    );
    expect(prepared).toEqual([]);
    await plugin.watchChange(id, { event: 'update' });

    const structuralSource = `${css('p-8')}\nexport const changed = sx('m-4');`;
    await writeFile(id, structuralSource);
    await plugin.watchChange(id, { event: 'update' });
    await writeFile(id, `${structuralSource}\nexport const another = sx('m-6');`);
    let releaseRead!: () => void;
    let markReadStarted!: () => void;
    const readStarted = new Promise<void>((resolve) => {
      markReadStarted = resolve;
    });
    mocks.readFileGate = new Promise<void>((resolve) => {
      releaseRead = resolve;
    });
    mocks.readStarted = markReadStarted;
    const structuralUpdate = plugin.watchChange(id, { event: 'update' });
    await readStarted;
    await plugin.watchChange(id, { event: 'delete' });
    releaseRead();
    await structuralUpdate;
    mocks.readFileGate = undefined;
    mocks.readStarted = undefined;
    expect(warning).not.toHaveBeenCalled();

    await rm(id);
    await plugin.watchChange(id, { event: 'update' });
    expect(warning).toHaveBeenCalledWith(expect.stringContaining('Vite stylesheet update failed'));
    await plugin.watchChange(id, { event: 'delete' });

    const warningCount = warning.mock.calls.length;
    const failedTheme = makePlugin();
    await failedTheme.vite.configureServer({ config: { root }, middlewares: { use() {} } });
    mocks.compileViteStylesheet.mockRejectedValueOnce(new Error('theme update failed'));
    await failedTheme.transform.handler(css('p-4'), join(root, 'failed-theme.ts'));
    expect(warning.mock.calls.length).toBeGreaterThan(warningCount);
    expect(warning).toHaveBeenCalledWith(expect.stringContaining('theme update failed'));

    mocks.compileViteStylesheet.mockRejectedValueOnce('stylesheet rejected with a string');
    const failedThemeValueFile = join(root, 'failed-theme-value.ts');
    await writeFile(failedThemeValueFile, css('p-4'));
    await plugin.transform.handler(css('p-4'), failedThemeValueFile);
    expect(warning).toHaveBeenCalledWith(expect.stringContaining('stylesheet rejected with a string'));

    const mutableOptions: { theme?: unknown } = {};
    const valueFailurePlugin = makePlugin(mutableOptions);
    await valueFailurePlugin.vite.configureServer({ config: { root }, middlewares: { use() {} } });
    const valueFailureFile = join(root, 'value-failure.ts');
    await writeFile(valueFailureFile, css('p-4'));
    await valueFailurePlugin.transform.handler(css('p-4'), valueFailureFile);
    mutableOptions.theme = {
      then(_resolve: unknown, reject: (reason: string) => void) {
        reject('transform rejected with a string');
      },
    };
    await writeFile(valueFailureFile, css('p-8'));
    await valueFailurePlugin.watchChange(valueFailureFile, { event: 'update' });
    expect(warning).toHaveBeenCalledWith(expect.stringContaining('transform rejected with a string'));

    const delayedId = join(root, 'delayed.ts');
    await writeFile(delayedId, css('p-4'));
    await plugin.transform.handler(css('p-4'), delayedId);
    const compileCallsBeforeClose = mocks.compileViteStylesheet.mock.calls.length;
    await writeFile(delayedId, css('p-8'));
    let releaseDelayedRead!: () => void;
    let markDelayedReadStarted!: () => void;
    const delayedReadStarted = new Promise<void>((resolve) => {
      markDelayedReadStarted = resolve;
    });
    mocks.readFileGate = new Promise<void>((resolve) => {
      releaseDelayedRead = resolve;
    });
    mocks.readStarted = markDelayedReadStarted;
    watcherChange?.(delayedId);
    await delayedReadStarted;
    watcherClose?.();
    releaseDelayedRead();
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(mocks.compileViteStylesheet).toHaveBeenCalledTimes(compileCallsBeforeClose);
    mocks.readFileGate = undefined;
    mocks.readStarted = undefined;

    watcherUnlink?.(id);
    watcherClose?.();

    const production = makePlugin({ mode: 'production' });
    const productionMiddleware = vi.fn();
    await production.vite.configureServer({ config: { root }, middlewares: { use: productionMiddleware } });
    expect(productionMiddleware).not.toHaveBeenCalled();

    const productionBuild = makePlugin();
    const productionBuildMiddleware = vi.fn();
    productionBuild.vite.configResolved({ command: 'build', root });
    await productionBuild.vite.configureServer({ config: { root }, middlewares: { use: productionBuildMiddleware } });
    await productionBuild.transform.handler(css('p-4'), join(root, 'production-build.ts'));
    expect(productionBuildMiddleware).not.toHaveBeenCalled();

    vi.stubEnv('NODE_ENV', 'production');
    const environmentProduction = makePlugin();
    const environmentMiddleware = vi.fn();
    await environmentProduction.vite.configureServer({
      config: { root },
      middlewares: { use: environmentMiddleware },
    });
    expect(environmentMiddleware).not.toHaveBeenCalled();
  } finally {
    warning.mockRestore();
    await rm(root, { recursive: true, force: true });
  }
});

it('starts and closes the Rollup development coordinator only in watch mode', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-unplugin-rollup-hmr-'));
  const previousCwd = process.cwd();
  const stop = vi.fn();
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  try {
    process.chdir(root);
    const projectRoot = process.cwd();
    mocks.coordinator.mockResolvedValueOnce(stop).mockRejectedValueOnce(new Error('Rollup coordinator failed'));
    const plugin = unpluginFactory({}, { framework: 'rollup', versions: {} } as never) as any;
    await plugin.transform.handler.call(
      { meta: { watchMode: true } },
      "import { sx } from '@cssxio/cssx'; export const className = sx('p-4');",
      join(root, 'app.tsx'),
    );
    plugin.rollup.buildStart.call({ meta: { watchMode: false } });
    await plugin.rollup.closeWatcher();

    plugin.rollup.buildStart.call({ meta: { watchMode: true } });
    await vi.waitFor(() =>
      expect(mocks.startServer).toHaveBeenCalledWith(projectRoot, join(projectRoot, '.cssx/rollup.css')),
    );
    await plugin.rollup.closeWatcher();
    expect(stop).toHaveBeenCalledOnce();
    expect(mocks.stopServer).toHaveBeenCalledWith(projectRoot);

    plugin.rollup.buildStart.call({ meta: { watchMode: true } });
    await vi.waitFor(() => expect(warning).toHaveBeenCalledWith(expect.stringContaining('Rollup coordinator failed')));
    await plugin.rollup.closeWatcher();

    mocks.startServer.mockImplementationOnce(() => {
      throw new Error('Rollup transport failed');
    });
    plugin.rollup.buildStart.call({ meta: { watchMode: true } });
    await vi.waitFor(() => expect(warning).toHaveBeenCalledWith(expect.stringContaining('Rollup transport failed')));
    await plugin.rollup.closeWatcher();

    mocks.rollupRuntimeCreationError = new Error('Rollup runtime initialization failed');
    plugin.rollup.buildStart.call({ meta: { watchMode: true } });
    await vi.waitFor(() =>
      expect(warning).toHaveBeenCalledWith(expect.stringContaining('Rollup runtime initialization failed')),
    );
    await plugin.rollup.closeWatcher();
  } finally {
    warning.mockRestore();
    process.chdir(previousCwd);
    await rm(root, { recursive: true, force: true });
  }
});

it('coalesces Rollup watch notifications and preserves stylesheet errors', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-unplugin-rollup-push-'));
  const previousCwd = process.cwd();
  const stop = vi.fn();
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  const plugin = unpluginFactory({ mode: 'development' }, { framework: 'rollup', versions: {} } as never) as any;
  const id = join(root, 'app.tsx');
  const source = (utility: string) => `import { sx } from '@cssxio/cssx'; export const className = sx('${utility}');`;
  try {
    process.chdir(root);
    mocks.coordinator.mockResolvedValue(stop);
    plugin.rollup.buildStart.call({ meta: { watchMode: true } });
    await plugin.transform.handler.call({ meta: { watchMode: true } }, source('p-4'), id);
    await plugin.rollup.buildEnd();
    plugin.rollup.buildStart.call({ meta: { watchMode: true } });

    await Promise.all([
      plugin.transform.handler.call({ meta: { watchMode: true } }, source('p-8'), id),
      plugin.transform.handler.call({ meta: { watchMode: true } }, source('p-8'), id),
    ]);
    expect(mocks.publishStyles).toHaveBeenCalledOnce();
    await plugin.transform.handler.call({ meta: { watchMode: true } }, source('p-8'), id);
    expect(mocks.publishStyles).toHaveBeenCalledOnce();

    mocks.publishStyles.mockRejectedValueOnce(new Error('publish failed'));
    await plugin.transform.handler.call({ meta: { watchMode: true } }, source('p-12'), id);
    expect(warning).toHaveBeenCalledWith(expect.stringContaining('publish failed'));
    mocks.publishStyles.mockRejectedValueOnce('publish failed with a string');
    await plugin.transform.handler.call({ meta: { watchMode: true } }, source('p-16'), id);
    expect(warning).toHaveBeenCalledWith(expect.stringContaining('publish failed with a string'));

    await plugin.watchChange(id, { event: 'delete' });
    expect(mocks.publishStyles).toHaveBeenCalledTimes(4);
    await plugin.rollup.closeWatcher();
    expect(stop).toHaveBeenCalledOnce();
  } finally {
    warning.mockRestore();
    process.chdir(previousCwd);
    await rm(root, { recursive: true, force: true });
  }
});

it('pushes Rollup CSS before the rebuild and reuses its prepared transform result', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-unplugin-rollup-fast-hmr-'));
  const previousCwd = process.cwd();
  const stop = vi.fn();
  const plugin = unpluginFactory({ mode: 'development' }, { framework: 'rollup', versions: {} } as never) as any;
  const id = join(root, 'app.tsx');
  const source = (utility: string) => `import { sx } from '@cssxio/cssx'; export const className = sx('${utility}');`;
  try {
    process.chdir(root);
    await writeFile(id, source('p-4'));
    mocks.coordinator.mockResolvedValue(stop);
    plugin.rollup.buildStart.call({ meta: { watchMode: true } });
    const initial = await plugin.transform.handler.call({ meta: { watchMode: true } }, source('p-4'), id);
    await plugin.rollup.buildEnd();

    await writeFile(id, source('p-8'));
    await plugin.watchChange(id, { event: 'update' });
    await vi.waitFor(() => expect(mocks.publishStyles).toHaveBeenCalledOnce());
    expect(mocks.publishStyles.mock.calls[0]?.[1]).toContain('padding');

    const rebuilt = await plugin.transform.handler.call({ meta: { watchMode: true } }, source('p-8'), id);
    expect(rebuilt.code).toContain(initial.code.match(/\bd[a-z0-9]+\b/)?.[0]);
    expect(mocks.publishStyles).toHaveBeenCalledOnce();
    await plugin.rollup.closeWatcher();
    expect(stop).toHaveBeenCalledOnce();
  } finally {
    process.chdir(previousCwd);
    await rm(root, { recursive: true, force: true });
  }
});

it('skips Rollup stylesheet updates when the development transport is unavailable', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-unplugin-rollup-no-transport-'));
  const previousCwd = process.cwd();
  const plugin = unpluginFactory({ mode: 'development' }, { framework: 'rollup', versions: {} } as never) as any;
  try {
    process.chdir(root);
    mocks.serverConnection.value = undefined;
    mocks.coordinator.mockResolvedValue(vi.fn());
    plugin.rollup.buildStart.call({ meta: { watchMode: true } });
    await plugin.transform.handler.call(
      { meta: { watchMode: true } },
      "import { sx } from '@cssxio/cssx'; export const className = sx('p-4');",
      join(root, 'app.tsx'),
    );
    await plugin.rollup.buildEnd();
    plugin.rollup.buildStart.call({ meta: { watchMode: true } });
    await plugin.transform.handler.call(
      { meta: { watchMode: true } },
      "import { sx } from '@cssxio/cssx'; export const className = sx('p-8');",
      join(root, 'app.tsx'),
    );
    expect(mocks.publishStyles).not.toHaveBeenCalled();
    await plugin.rollup.closeWatcher();
  } finally {
    process.chdir(previousCwd);
    await rm(root, { recursive: true, force: true });
  }
});
