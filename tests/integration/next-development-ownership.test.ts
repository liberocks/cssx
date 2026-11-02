import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { request as httpRequest, createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { expect, it, vi } from 'vitest';

import { startDevelopmentCoordinator } from '../../packages/unplugin/src/adapters/development-coordinator';
import { nextDevelopmentHmrConnection } from '../../packages/unplugin/src/adapters/next-development-connection';
import {
  publishNextDevelopmentStylesheet,
  readNextDevelopmentStylesheetStatus,
  reportNextDevelopmentStartupStatus,
  retryNextDevelopmentServerOwnership,
  startNextDevelopmentServer,
  stopNextDevelopmentServer,
  waitForNextDevelopmentServerBinding,
} from '../../packages/unplugin/src/adapters/next-development-server';
import { developmentPluginOptions } from '../../packages/unplugin/src/core/options';

const runtimePath = resolve(import.meta.dirname, '../../packages/unplugin/dist/development-runtime.cjs');

it('routes publication through the owning Node process and takes ownership after it exits', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-next-owner-handoff-'));
  const stylesheetFile = join(root, '.cssx', 'next.css');
  let owner: Worker | undefined;
  let takeover: Worker | undefined;
  try {
    owner = startWorker(root, stylesheetFile, 'hold');
    await expect(owner.firstLine).resolves.toBe('owner');

    const publisher = startWorker(root, stylesheetFile, 'publish');
    await expect(publisher.firstLine).resolves.toBe('remote');
    await expect(exitResult(publisher.child, publisher.stderr)).resolves.toMatchObject({ code: 0 });

    const connection = nextDevelopmentHmrConnection(root, stylesheetFile);
    const base = `http://127.0.0.1:${connection.port}/${connection.token}`;
    await expect(fetch(`${base}/ready`)).resolves.toMatchObject({ status: 200 });
    await expect((await fetch(`${base}/stylesheet`)).text()).resolves.toBe('.dprocess{color:green;}');

    await stopWorker(owner.child);
    owner = undefined;
    takeover = startWorker(root, stylesheetFile, 'publish-hold');
    await expect(takeover.firstLine).resolves.toBe('owner');
    await expect(fetch(`${base}/ready`)).resolves.toMatchObject({ status: 200 });
    await expect((await fetch(`${base}/stylesheet`)).text()).resolves.toBe('.dprocess{color:green;}');
  } finally {
    if (owner) {
      await stopWorker(owner.child);
    }
    if (takeover) {
      await stopWorker(takeover.child);
    }
    await rm(root, { recursive: true, force: true });
  }
}, 20_000);

it('allows concurrent applications and rejects unrelated port occupants with a useful error', async () => {
  const roots = await Promise.all([
    mkdtemp(join(tmpdir(), 'cssx-next-owner-app-a-')),
    mkdtemp(join(tmpdir(), 'cssx-next-owner-app-b-')),
    mkdtemp(join(tmpdir(), 'cssx-next-owner-port-')),
  ]);
  const workers: ChildProcess[] = [];
  try {
    const first = startWorker(roots[0]!, join(roots[0]!, '.cssx/next.css'), 'hold');
    const second = startWorker(roots[1]!, join(roots[1]!, '.cssx/next.css'), 'hold');
    workers.push(first.child, second.child);
    await expect(first.firstLine).resolves.toBe('owner');
    await expect(second.firstLine).resolves.toBe('owner');

    const sharedRoot = await mkdtemp(join(tmpdir(), 'cssx-next-owner-race-'));
    roots.push(sharedRoot);
    const sharedSheet = join(sharedRoot, '.cssx/next.css');
    const contenders = [startWorker(sharedRoot, sharedSheet, 'hold'), startWorker(sharedRoot, sharedSheet, 'hold')];
    workers.push(...contenders.map(({ child }) => child));
    const roles = await Promise.all(contenders.map(({ firstLine }) => firstLine));
    expect(roles.sort()).toEqual(['owner', 'remote']);

    const stylesheetFile = join(roots[2]!, '.cssx/next.css');
    const connection = nextDevelopmentHmrConnection(roots[2]!, stylesheetFile);
    const occupant = startOccupant(connection.port);
    workers.push(occupant.child);
    await expect(occupant.firstLine).resolves.toBe('occupied');

    const conflictingWorker = startWorker(roots[2]!, stylesheetFile, 'publish');
    workers.push(conflictingWorker.child);
    void conflictingWorker.firstLine.catch(() => undefined);
    const result = await exitResult(conflictingWorker.child, conflictingWorker.stderr);
    expect(result.code).not.toBe(0);
    expect(result.stderr).toContain(roots[2]);
    expect(result.stderr).toContain(String(connection.port));
    expect(result.stderr).toContain('could not own port');
  } finally {
    await Promise.all(workers.map(stopWorker));
    await Promise.all(roots.map((root) => rm(root, { recursive: true, force: true })));
  }
}, 20_000);

it('reports initial compilation failures and recovers automatically after the source is fixed', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-next-startup-recovery-'));
  const sourceDir = join(root, 'app');
  const sourceFile = join(sourceDir, 'page.tsx');
  const stylesheetFile = join(root, '.cssx', 'next.css');
  const connection = startNextDevelopmentServer(root, stylesheetFile);
  let stop: (() => void) | undefined;
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  try {
    await mkdir(sourceDir, { recursive: true });
    await writeFile(sourceFile, "import { sx } from '@cssxio/cssx'; export const className = sx('p-4');");
    await mkdir(stylesheetFile);
    stop = await startDevelopmentCoordinator(
      root,
      stylesheetFile,
      developmentPluginOptions({ sourceMap: false, preflight: false }),
      connection,
      undefined,
      true,
    );

    const base = `http://127.0.0.1:${connection.port}/${connection.token}`;
    const failed = await fetch(`${base}/ready`);
    expect(failed.status).toBe(500);
    const failedStatus = await failed.json();
    expect(failedStatus).toMatchObject({ state: 'failed', phase: 'initial stylesheet compilation' });

    await writeFile(sourceFile, "import { sx } from '@cssxio/cssx'; export const className = sx('p-8');");
    await vi.waitFor(() =>
      expect(warning).toHaveBeenCalledWith(expect.stringContaining('development source update failed')),
    );
    await rm(stylesheetFile, { recursive: true, force: true });
    await writeFile(sourceFile, "import { sx } from '@cssxio/cssx'; export const className = sx('p-10');");
    await waitForReady(base);
    await expect((await fetch(`${base}/stylesheet`)).text()).resolves.toContain('padding:calc(0.25rem * 10)');
  } finally {
    stop?.();
    stopNextDevelopmentServer(root);
    warning.mockRestore();
    await rm(root, { recursive: true, force: true });
  }
}, 20_000);

it('reports transport phases and transitions the endpoint through starting, failed, and ready', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-next-owner-status-'));
  const stylesheetFile = join(root, '.cssx', 'next.css');
  const connection = startNextDevelopmentServer(root, stylesheetFile);
  try {
    await expect(waitForNextDevelopmentServerBinding(root)).resolves.toBe('owner');
    await expect(readNextDevelopmentStylesheetStatus(connection)).resolves.toMatchObject({ state: 'starting', root });
    expect(retryNextDevelopmentServerOwnership(root, stylesheetFile)).toEqual(connection);
    await reportNextDevelopmentStartupStatus(connection, 'initial source scan');
    await reportNextDevelopmentStartupStatus(connection, 'theme load', 'theme parse failed');
    await expect(readNextDevelopmentStylesheetStatus(connection)).resolves.toMatchObject({
      state: 'failed',
      phase: 'theme load',
      error: 'theme parse failed',
    });

    const base = `http://127.0.0.1:${connection.port}/${connection.token}`;
    await expect(fetch(`${base}/status`, { method: 'POST', body: '{}' })).resolves.toMatchObject({ status: 204 });
    await expect(fetch(`${base}/status`, { method: 'POST', body: '{broken json' })).resolves.toMatchObject({
      status: 400,
    });
    await publishNextDevelopmentStylesheet(connection, '.dstatus{color:green;}');
    await expect(readNextDevelopmentStylesheetStatus(connection)).resolves.toMatchObject({
      state: 'ready',
      phase: 'ready',
    });
  } finally {
    stopNextDevelopmentServer(root);
    await rm(root, { recursive: true, force: true });
  }
});

it('rejects a port occupant with an invalid CSSX status payload', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-next-owner-invalid-status-'));
  const stylesheetFile = join(root, '.cssx', 'next.css');
  const connection = nextDevelopmentHmrConnection(root, stylesheetFile);
  const occupant = createServer((request, response) => {
    if (request.url === `/${connection.token}/ready`) {
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end('null');
      return;
    }
    response.writeHead(404);
    response.end();
  });
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  try {
    await new Promise<void>((resolveListen, rejectListen) => {
      occupant.once('error', rejectListen);
      occupant.listen(connection.port, '127.0.0.1', resolveListen);
    });
    startNextDevelopmentServer(root, stylesheetFile);
    await expect(waitForNextDevelopmentServerBinding(root)).rejects.toThrow(
      'the endpoint did not identify itself as a CSSX stylesheet transport',
    );
    expect(warning).toHaveBeenCalledWith(expect.stringContaining(String(connection.port)));
  } finally {
    warning.mockRestore();
    await new Promise<void>((resolveClose) => occupant.close(() => resolveClose()));
    stopNextDevelopmentServer(root);
    await rm(root, { recursive: true, force: true });
  }
});

it('rejects interrupted status request bodies', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-next-owner-aborted-status-'));
  const stylesheetFile = join(root, '.cssx', 'next.css');
  const connection = startNextDevelopmentServer(root, stylesheetFile);
  try {
    await waitForNextDevelopmentServerBinding(root);
    await new Promise<void>((resolveRequest) => {
      const request = httpRequest({
        hostname: '127.0.0.1',
        port: connection.port,
        path: `/${connection.token}/status`,
        method: 'POST',
        headers: { 'Content-Length': '100' },
      });
      request.once('error', () => resolveRequest());
      request.once('socket', (socket) => {
        socket.once('connect', () => {
          request.write('{');
          setTimeout(() => request.destroy(), 10);
        });
      });
    });
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 20));
  } finally {
    stopNextDevelopmentServer(root);
    await rm(root, { recursive: true, force: true });
  }
});

it('adopts a verified same-app endpoint, forwards status, and retries its ownership', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-next-owner-same-process-'));
  const stylesheetFile = join(root, '.cssx', 'next.css');
  const ownerConnection = startNextDevelopmentServer(root, stylesheetFile);
  let remote: typeof import('../../packages/unplugin/src/adapters/next-development-server') | undefined;
  try {
    await expect(waitForNextDevelopmentServerBinding(root)).resolves.toBe('owner');
    vi.resetModules();
    remote = await import('../../packages/unplugin/src/adapters/next-development-server');
    const remoteConnection = remote.startNextDevelopmentServer(root, stylesheetFile);
    expect(remoteConnection).toEqual(ownerConnection);
    await expect(remote.waitForNextDevelopmentServerBinding(root)).resolves.toBe('remote');

    await remote.reportNextDevelopmentStartupStatus(remoteConnection, 'remote scan', 'remote error');
    await expect(readNextDevelopmentStylesheetStatus(ownerConnection)).resolves.toMatchObject({
      state: 'failed',
      phase: 'remote scan',
      error: 'remote error',
    });
    await remote.publishNextDevelopmentStylesheet(remoteConnection, '.downer{color:blue;}');
    await expect(
      (await fetch(`http://127.0.0.1:${ownerConnection.port}/${ownerConnection.token}/stylesheet`)).text(),
    ).resolves.toBe('.downer{color:blue;}');

    expect(remote.retryNextDevelopmentServerOwnership(root, stylesheetFile)).toEqual(ownerConnection);
    await expect(remote.waitForNextDevelopmentServerBinding(root)).resolves.toBe('remote');
  } finally {
    remote?.stopNextDevelopmentServer(root);
    stopNextDevelopmentServer(root);
    await rm(root, { recursive: true, force: true });
  }
});

it('rejects a CSSX-shaped port occupant that belongs to another app root', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-next-owner-foreign-port-'));
  const stylesheetFile = join(root, '.cssx', 'next.css');
  const connection = nextDevelopmentHmrConnection(root, stylesheetFile);
  const occupant = createServer((request, response) => {
    if (request.url === `/${connection.token}/ready`) {
      response.writeHead(503, { 'Content-Type': 'application/json' });
      response.end(
        JSON.stringify({
          protocol: 1,
          root: '/another-project',
          stylesheetFile: '/another-project/.cssx/next.css',
          state: 'starting',
          phase: 'initial scan',
        }),
      );
      return;
    }
    response.writeHead(404);
    response.end();
  });
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  try {
    await new Promise<void>((resolveListen, rejectListen) => {
      occupant.once('error', rejectListen);
      occupant.listen(connection.port, '127.0.0.1', resolveListen);
    });
    startNextDevelopmentServer(root, stylesheetFile);
    await expect(waitForNextDevelopmentServerBinding(root)).rejects.toThrow(
      'the endpoint belongs to /another-project and /another-project/.cssx/next.css',
    );
    expect(warning).toHaveBeenCalledWith(expect.stringContaining(String(connection.port)));
  } finally {
    warning.mockRestore();
    await new Promise<void>((resolveClose) => occupant.close(() => resolveClose()));
    stopNextDevelopmentServer(root);
    await rm(root, { recursive: true, force: true });
  }
});

interface Worker {
  readonly child: ChildProcess;
  readonly firstLine: Promise<string>;
  readonly stderr: () => string;
}

function startWorker(root: string, stylesheetFile: string, mode: 'hold' | 'publish' | 'publish-hold'): Worker {
  const source = `
    const runtime = require(process.argv[1]);
    const root = process.argv[2];
    const stylesheetFile = process.argv[3];
    const mode = process.argv[4];
    const connection = runtime.startNextDevelopmentServer(root, stylesheetFile);
    runtime.waitForNextDevelopmentServerBinding(root).then(async (ownership) => {
      if (mode.includes('publish')) {
        await runtime.publishNextDevelopmentStylesheet(connection, '.dprocess{color:green;}');
      }
      process.stdout.write(ownership + '\\n');
      if (mode.includes('hold')) setInterval(() => {}, 1000);
    }).catch((error) => { process.stderr.write(String(error.stack || error)); process.exitCode = 1; });
  `;
  const child = spawn(process.execPath, ['-e', source, runtimePath, root, stylesheetFile, mode], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return makeWorker(child);
}

function startOccupant(port: number): Worker {
  const source = `
    require('node:http').createServer((request, response) => { response.writeHead(404); response.end(); })
      .listen(Number(process.argv[1]), '127.0.0.1', () => { process.stdout.write('occupied\\n'); });
    setInterval(() => {}, 1000);
  `;
  const child = spawn(process.execPath, ['-e', source, String(port)], { stdio: ['ignore', 'pipe', 'pipe'] });
  return makeWorker(child);
}

function makeWorker(child: ChildProcess): Worker {
  let stderrOutput = '';
  child.stderr?.on('data', (chunk: Buffer | string) => {
    stderrOutput += chunk.toString();
  });
  return { child, firstLine: firstLine(child), stderr: () => stderrOutput };
}

function firstLine(child: ChildProcess): Promise<string> {
  const lines = createInterface({ input: child.stdout! });
  return new Promise((resolveLine, rejectLine) => {
    const timer = setTimeout(
      () => rejectLine(new Error('Worker did not report its transport role in 5 seconds.')),
      5_000,
    );
    lines.once('line', (line) => {
      clearTimeout(timer);
      lines.close();
      resolveLine(line);
    });
    child.once('error', (error) => {
      clearTimeout(timer);
      lines.close();
      rejectLine(error);
    });
    child.once('exit', (code) => {
      if (code !== 0) {
        clearTimeout(timer);
        lines.close();
        rejectLine(new Error(`Worker exited with ${code}.`));
      }
    });
  });
}

async function exitResult(
  child: ChildProcess,
  getStderr: () => string,
): Promise<{ code: number | null; stderr: string }> {
  const [code] = child.exitCode === null ? await once(child, 'exit') : [child.exitCode];
  return { code: code as number | null, stderr: getStderr() };
}

async function stopWorker(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) {
    return;
  }
  const exited = once(child, 'exit');
  child.kill('SIGTERM');
  await exited;
}

async function waitForReady(base: string): Promise<void> {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    const response = await fetch(`${base}/ready`);
    if (response.status === 200) {
      return;
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 25));
  }
  throw new Error(`CSSX development stylesheet did not recover at ${base}.`);
}
