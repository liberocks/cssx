import cssxEsbuild from '@cssxio/unplugin/esbuild';
import cssxRollup from '@cssxio/unplugin/rollup';
import cssxRspack from '@cssxio/unplugin/rspack';
import cssxWebpack from '@cssxio/unplugin/webpack';
import { expect, test } from '@playwright/test';
import { rspack } from '@rspack/core';
import { context as esbuildContext } from 'esbuild';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { basename, join, relative } from 'node:path';
import { watch as rollupWatch } from 'rollup';
import type { RollupWatcher, RollupWatcherEvent } from 'rollup';
import webpack from 'webpack';

const adapters = ['esbuild', 'rollup', 'webpack', 'rspack'] as const;
type AdapterName = (typeof adapters)[number];

interface AdapterHandle {
  readonly close: () => Promise<void>;
  readonly waitForBuild?: () => Promise<void>;
}

test.describe.configure({ mode: 'serial' });

for (const adapter of adapters) {
  test(adapter + ' pushes 30 warm stylesheet updates within 100 ms', async ({ page }) => {
    test.setTimeout(120_000);
    const fixture = await createFixture(adapter);
    const previousCwd = process.cwd();
    let closeBuild: (() => Promise<void>) | undefined;
    let waitForBuild: (() => Promise<void>) | undefined;
    let server: ReturnType<typeof createServer> | undefined;
    try {
      const adapterHandle = await startAdapter(adapter, fixture);
      closeBuild = adapterHandle.close;
      waitForBuild = adapterHandle.waitForBuild;
      await waitForCoordinatorStylesheet(fixture.coordinatorStylesheet);
      server = createStaticServer(fixture.outputDirectory);
      const url = await listen(server);
      await page.addInitScript(() => {
        const key = '__cssxDocumentLoads';
        sessionStorage.setItem(key, String(Number(sessionStorage.getItem(key) ?? '0') + 1));
      });
      await page.goto(url);
      await expect(page.locator('#target')).toHaveCSS('padding-top', '8px');
      await page.waitForFunction(() => {
        const state = (
          globalThis as typeof globalThis & {
            __cssxDevelopmentStylesheetHmr?: { events?: EventSource };
          }
        ).__cssxDevelopmentStylesheetHmr;
        return state?.events?.readyState === EventSource.OPEN;
      });
      const initialLoads = await page.evaluate(() => Number(sessionStorage.getItem('__cssxDocumentLoads')));
      await page.evaluate(() => {
        const input = document.createElement('input');
        input.setAttribute('data-cssx-hmr-state', '');
        input.value = 'preserve this input';
        input.style.position = 'fixed';
        input.style.bottom = '16px';
        document.body.append(input);
        const spacer = document.createElement('div');
        spacer.style.height = '2400px';
        document.body.append(spacer);
        const state = window as Window & { __cssxHmrInput?: HTMLInputElement };
        state.__cssxHmrInput = input;
        input.focus();
        window.scrollTo(0, 900);
      });

      let current = 'p-2';
      let source = await readFile(fixture.styleSource, 'utf8');
      const measurements: number[] = [];
      for (let edit = 0; edit < 30; edit++) {
        const next = current === 'p-2' ? 'p-4' : 'p-2';
        source = source.replace("sx('" + current + "')", "sx('" + next + "')");
        const expected = next === 'p-2' ? '8px' : '16px';
        await page.evaluate((expectedPadding) => {
          const state = window as Window & {
            __cssxHmrExpectedPadding?: string;
            __cssxHmrVisibleAt?: number;
          };
          state.__cssxHmrExpectedPadding = expectedPadding;
          state.__cssxHmrVisibleAt = undefined;
          const observer = new MutationObserver(() => {
            const element = document.querySelector('#target');
            if (element && getComputedStyle(element).paddingTop === state.__cssxHmrExpectedPadding) {
              observer.disconnect();
              requestAnimationFrame(() => {
                state.__cssxHmrVisibleAt = performance.timeOrigin + performance.now();
              });
            }
          });
          observer.observe(document.head, { childList: true, subtree: true });
        }, expected);
        const buildFinished = waitForBuild?.();
        await writeFile(fixture.styleSource, source);
        const savedAt = performance.timeOrigin + performance.now();
        await page.waitForFunction(
          () => typeof (window as Window & { __cssxHmrVisibleAt?: number }).__cssxHmrVisibleAt === 'number',
          undefined,
          { timeout: 5_000 },
        );
        const visibleAt = await page.evaluate(
          () => (window as Window & { __cssxHmrVisibleAt: number }).__cssxHmrVisibleAt,
        );
        measurements.push(visibleAt - savedAt);
        console.info(adapter + ' edit ' + (edit + 1) + ': ' + measurements.at(-1) + ' ms');
        const state = await page.evaluate(() => {
          const windowState = window as Window & { __cssxHmrInput?: HTMLInputElement };
          return {
            documentLoads: Number(sessionStorage.getItem('__cssxDocumentLoads')),
            inputValue: windowState.__cssxHmrInput?.value,
            inputFocused: document.activeElement === windowState.__cssxHmrInput,
            inputIdentityPreserved: windowState.__cssxHmrInput === document.querySelector('[data-cssx-hmr-state]'),
            scrollY: window.scrollY,
          };
        });
        expect(state.documentLoads).toBe(initialLoads);
        expect(state.inputValue).toBe('preserve this input');
        expect(state.inputFocused).toBe(true);
        expect(state.inputIdentityPreserved).toBe(true);
        expect(state.scrollY).toBeGreaterThanOrEqual(850);
        await buildFinished;
        current = next;
      }
      const sorted = [...measurements].sort((left, right) => left - right);
      console.info(
        adapter +
          ' warm HMR: p50 ' +
          sorted[14]!.toFixed(1) +
          ' ms, p95 ' +
          sorted[28]!.toFixed(1) +
          ' ms, max ' +
          sorted[29]!.toFixed(1) +
          ' ms.',
      );
      expect(sorted[29]).toBeLessThanOrEqual(100);
    } finally {
      await closeBuild?.();
      if (server) await closeServer(server);
      process.chdir(previousCwd);
      await rm(fixture.root, { recursive: true, force: true });
      await rm(fixture.workspaceRoot, { recursive: true, force: true });
    }
  });
}

test('rollup publishes the latest stylesheet after rapid saves', async ({ page }) => {
  test.setTimeout(120_000);
  const fixture = await createFixture('rollup');
  const previousCwd = process.cwd();
  let closeBuild: (() => Promise<void>) | undefined;
  let server: ReturnType<typeof createServer> | undefined;
  try {
    const adapterHandle = await startAdapter('rollup', fixture);
    closeBuild = adapterHandle.close;
    await waitForCoordinatorStylesheet(fixture.coordinatorStylesheet);
    server = createStaticServer(fixture.outputDirectory);
    const url = await listen(server);
    await page.goto(url);
    await expect(page.locator('#target')).toHaveCSS('padding-top', '8px');
    await page.waitForFunction(() => {
      const state = (
        globalThis as typeof globalThis & {
          __cssxDevelopmentStylesheetHmr?: { events?: EventSource };
        }
      ).__cssxDevelopmentStylesheetHmr;
      return state?.events?.readyState === EventSource.OPEN;
    });

    let current = 'p-2';
    let source = await readFile(fixture.styleSource, 'utf8');
    for (let edit = 0; edit < 5; edit++) {
      const next = current === 'p-2' ? 'p-4' : 'p-2';
      source = source.replace("sx('" + current + "')", "sx('" + next + "')");
      await writeFile(fixture.styleSource, source);
      current = next;
    }

    await expect(page.locator('#target')).toHaveCSS('padding-top', '16px');
  } finally {
    await closeBuild?.();
    if (server) await closeServer(server);
    process.chdir(previousCwd);
    await rm(fixture.root, { recursive: true, force: true });
    await rm(fixture.workspaceRoot, { recursive: true, force: true });
  }
});

interface Fixture {
  readonly root: string;
  readonly workspaceRoot: string;
  readonly outputDirectory: string;
  readonly styleSource: string;
  readonly coordinatorStylesheet: string;
}

async function createFixture(adapter: AdapterName): Promise<Fixture> {
  const fixtureName = 'cssx-hmr-' + adapter + '-' + process.pid + '-' + Date.now();
  const root = join(tmpdir(), fixtureName + '-app');
  const workspaceRoot = join(tmpdir(), fixtureName + '-workspace');
  const outputDirectory = join(root, 'dist');
  const sourceDirectory = join(root, 'src');
  const styleSource = join(workspaceRoot, 'style.js');
  await Promise.all([mkdir(sourceDirectory, { recursive: true }), mkdir(workspaceRoot, { recursive: true })]);
  const importPath = relative(sourceDirectory, styleSource).replaceAll('\\', '/');
  await writeFile(
    join(sourceDirectory, 'app.js'),
    "import { className } from '" + importPath + "';\ndocument.querySelector('#target').className = className;\n",
  );
  await writeFile(styleSource, "import { sx } from '@cssxio/cssx'; export const className = sx('p-2');\n");
  await Promise.all(
    Array.from({ length: 400 }, (_, index) =>
      writeFile(join(workspaceRoot, 'unused-' + index + '.js'), 'export const item' + index + ' = ' + index + ';\n'),
    ),
  );
  await mkdir(join(root, '.open-next'), { recursive: true });
  await writeFile(join(root, '.open-next', 'generated-bundle.js'), 'x'.repeat(8 * 1024 * 1024));
  return {
    root,
    workspaceRoot,
    outputDirectory,
    styleSource,
    coordinatorStylesheet:
      adapter === 'esbuild'
        ? join(root, 'dist', 'cssx.css')
        : join(root, '.cssx', adapter === 'webpack' || adapter === 'rspack' ? 'native.css' : `${adapter}.css`),
  };
}

async function startAdapter(adapter: AdapterName, fixture: Fixture): Promise<AdapterHandle> {
  const options = {
    mode: 'development' as const,
    preflight: false,
    sourceMap: false,
    sourceRoots: [fixture.workspaceRoot],
  };
  if (adapter === 'esbuild') {
    const build = await esbuildContext({
      absWorkingDir: fixture.root,
      bundle: true,
      entryPoints: ['src/app.js'],
      format: 'iife',
      outfile: 'dist/bundle.js',
      plugins: [cssxEsbuild(options)],
    });
    await build.rebuild();
    await build.watch();
    return { close: async () => build.dispose() };
  }
  if (adapter === 'rollup') {
    process.chdir(fixture.root);
    const watcher = rollupWatch({
      input: 'src/app.js',
      output: { file: 'dist/bundle.js', format: 'iife', name: 'CSSXTest' },
      plugins: [cssxRollup(options)],
      watch: { buildDelay: 0 },
    });
    await waitForRollupBuild(watcher);
    return {
      close: async () => watcher.close(),
      waitForBuild: () => waitForRollupBuild(watcher, true),
    };
  }
  if (adapter === 'webpack') {
    const compiler = webpack({
      context: fixture.root,
      entry: './src/app.js',
      mode: 'development',
      optimization: { minimize: false },
      output: { filename: 'bundle.js', path: fixture.outputDirectory },
      plugins: [cssxWebpack(options)],
      watchOptions: { aggregateTimeout: 1 },
    });
    let watching: { close(callback: (error?: Error | null) => void): void } | undefined;
    try {
      await new Promise<void>((resolveBuild, rejectBuild) => {
        watching = compiler.watch({ aggregateTimeout: 1 }, (error, stats) => {
          if (error) return rejectBuild(error);
          if (stats?.hasErrors()) return rejectBuild(new Error(stats.toString({ all: false, errors: true })));
          resolveBuild();
        });
      });
      return {
        close: async () => {
          await new Promise<void>((resolveClose, rejectClose) =>
            watching?.close((error) => (error ? rejectClose(error) : resolveClose())),
          );
          await new Promise<void>((resolveClose, rejectClose) =>
            compiler.close((error) => (error ? rejectClose(error) : resolveClose())),
          );
        },
      };
    } catch (error) {
      await new Promise<void>((resolveClose) => compiler.close(() => resolveClose()));
      throw error;
    }
  }

  const compiler = rspack({
    context: fixture.root,
    entry: './src/app.js',
    mode: 'development',
    optimization: { minimize: false },
    output: { filename: 'bundle.js', path: fixture.outputDirectory },
    plugins: [cssxRspack(options)],
    watchOptions: { aggregateTimeout: 1 },
  });
  let watching: { close(callback: (error?: Error | null) => void): void } | undefined;
  try {
    await new Promise<void>((resolveBuild, rejectBuild) => {
      watching = compiler.watch({ aggregateTimeout: 1 }, (error, stats) => {
        if (error) return rejectBuild(error);
        if (stats?.hasErrors()) return rejectBuild(new Error(stats.toString({ all: false, errors: true })));
        resolveBuild();
      });
    });
    return {
      close: async () => {
        await new Promise<void>((resolveClose, rejectClose) =>
          watching?.close((error) => (error ? rejectClose(error) : resolveClose())),
        );
        await new Promise<void>((resolveClose, rejectClose) =>
          compiler.close((error) => (error ? rejectClose(error) : resolveClose())),
        );
      },
    };
  } catch (error) {
    await new Promise<void>((resolveClose) => compiler.close(() => resolveClose()));
    throw error;
  }
}

function createStaticServer(outputDirectory: string) {
  return createServer(async (request, response) => {
    const pathname = new URL(request.url ?? '/', 'http://127.0.0.1').pathname;
    if (pathname === '/') {
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      response.end(
        '<!doctype html><html><head><link rel="stylesheet" href="/cssx.css"></head><body><div id="target">target</div><script src="/bundle.js"></script></body></html>',
      );
      return;
    }
    const fileName = pathname === '/cssx.css' ? 'cssx.css' : pathname === '/bundle.js' ? 'bundle.js' : undefined;
    if (!fileName) {
      response.writeHead(404);
      response.end();
      return;
    }
    try {
      response.writeHead(200, {
        'Content-Type': fileName.endsWith('.css') ? 'text/css; charset=utf-8' : 'text/javascript; charset=utf-8',
      });
      response.end(await readFile(join(outputDirectory, fileName)));
    } catch {
      response.writeHead(503);
      response.end();
    }
  });
}

async function listen(server: ReturnType<typeof createServer>): Promise<string> {
  await new Promise<void>((resolveListen, rejectListen) => {
    server.once('error', rejectListen);
    server.listen(0, '127.0.0.1', resolveListen);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('The browser fixture server did not bind a TCP port.');
  return 'http://127.0.0.1:' + address.port;
}

async function closeServer(server: ReturnType<typeof createServer>): Promise<void> {
  await new Promise<void>((resolveClose, rejectClose) =>
    server.close((error) => (error ? rejectClose(error) : resolveClose())),
  );
}

async function waitForCoordinatorStylesheet(fileName: string): Promise<void> {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try {
      if ((await readFile(fileName, 'utf8')).includes('padding:calc(0.25rem * 2)')) return;
    } catch {
      // The initial source scan and compilation are still running.
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 10));
  }
  throw new Error('The ' + basename(fileName) + ' coordinator did not finish its initial scan.');
}

async function waitForRollupBuild(watcher: RollupWatcher, requireStart = false): Promise<void> {
  await new Promise<void>((resolveBuild, rejectBuild) => {
    let started = false;
    const onEvent = (event: RollupWatcherEvent) => {
      if (event.code === 'ERROR') {
        watcher.off('event', onEvent);
        rejectBuild(event.error);
      } else if (event.code === 'START') {
        started = true;
      } else if (event.code === 'END' && (!requireStart || started)) {
        watcher.off('event', onEvent);
        resolveBuild();
      }
    };
    watcher.on('event', onEvent);
  });
}
