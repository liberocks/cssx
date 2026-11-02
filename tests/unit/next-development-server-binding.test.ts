import { EventEmitter } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import type { Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';

let root: string | undefined;
let runtime: typeof import('../../packages/unplugin/src/adapters/next-development-server') | undefined;

afterEach(async () => {
  vi.doUnmock('node:http');
  vi.restoreAllMocks();
  vi.resetModules();
  if (root) {
    await rm(root, { recursive: true, force: true });
    root = undefined;
  }
  runtime = undefined;
});

it('rejects asynchronous non-port bind errors and ignores errors after binding', async () => {
  root = await mkdtemp(join(tmpdir(), 'cssx-next-bind-error-'));
  let server: ReturnType<typeof makeServer>;
  server = makeServer((target) => {
    queueMicrotask(() => target.emit('error', Object.assign(new Error('permission denied'), { code: 'EACCES' })));
  });
  runtime = await loadServerModule(server);
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  runtime.startNextDevelopmentServer(root, join(root, 'next.css'));

  await expect(runtime.waitForNextDevelopmentServerBinding(root)).rejects.toThrow('could not own port');
  expect(warning).toHaveBeenCalledWith(expect.stringContaining('permission denied'));
  expect(server.close).toHaveBeenCalled();
  runtime.stopNextDevelopmentServer(root);
  await rm(root, { recursive: true, force: true });

  root = await mkdtemp(join(tmpdir(), 'cssx-next-bind-late-error-'));
  server = makeServer((target) => queueMicrotask(() => target.emit('listening')));
  runtime = await loadServerModule(server);
  const ownerConnection = runtime.startNextDevelopmentServer(root, join(root, 'next.css'));
  await expect(runtime.waitForNextDevelopmentServerBinding(root)).resolves.toBe('owner');
  server.emit('error', Object.assign(new Error('late address event'), { code: 'EADDRINUSE' }));
  expect(warning).toHaveBeenCalledTimes(1);
  expect(runtime.retryNextDevelopmentServerOwnership(root, join(root, 'next.css'))).toEqual(ownerConnection);
  runtime.stopNextDevelopmentServer(root);
});

it('cleans up a server stopped before its listen callback', async () => {
  root = await mkdtemp(join(tmpdir(), 'cssx-next-bind-stop-'));
  const server = makeServer(() => undefined);
  runtime = await loadServerModule(server);
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  runtime.startNextDevelopmentServer(root, join(root, 'next.css'));
  runtime.stopNextDevelopmentServer(root);
  server.emit('listening');

  await expect(runtime.waitForNextDevelopmentServerBinding(root)).rejects.toThrow('was not started');
  expect(warning).toHaveBeenCalledWith(expect.stringContaining('was stopped'));
  expect(server.close).toHaveBeenCalledTimes(2);
});

function makeServer(onListen: (server: EventEmitter) => void) {
  const server = new EventEmitter() as EventEmitter & {
    listen: ReturnType<typeof vi.fn>;
    unref: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
  };
  server.listen = vi.fn(() => {
    onListen(server);
    return server as unknown as Server;
  });
  server.unref = vi.fn(() => server);
  server.close = vi.fn(() => {
    throw new Error('server was not listening');
  });
  return server;
}

async function loadServerModule(server: ReturnType<typeof makeServer>) {
  vi.resetModules();
  vi.doMock('node:http', async (importOriginal) => {
    const actual = await importOriginal<typeof import('node:http')>();
    return { ...actual, createServer: () => server as unknown as Server };
  });
  return import('../../packages/unplugin/src/adapters/next-development-server');
}
