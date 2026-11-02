import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { ensureNextDevelopmentStylesheet } from '../../packages/unplugin/src/adapters/next-development-runtime';

const mocks = vi.hoisted(() => ({
  coordinator: vi.fn(),
  readStatus: vi.fn(),
  reportStatus: vi.fn(),
  retryOwnership: vi.fn(),
  startServer: vi.fn(),
  waitBinding: vi.fn(),
}));

vi.mock('../../packages/unplugin/src/adapters/development-coordinator', () => ({
  startDevelopmentCoordinator: mocks.coordinator,
}));
vi.mock('../../packages/unplugin/src/adapters/next-development-server', () => ({
  readNextDevelopmentStylesheetStatus: mocks.readStatus,
  reportNextDevelopmentStartupStatus: mocks.reportStatus,
  retryNextDevelopmentServerOwnership: mocks.retryOwnership,
  startNextDevelopmentServer: mocks.startServer,
  waitForNextDevelopmentServerBinding: mocks.waitBinding,
}));

const connection = { port: 45_101, token: 'runtime-test' };
let root: string;
let stylesheetFile: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'cssx-next-runtime-unit-'));
  stylesheetFile = join(root, '.cssx', 'next.css');
  mocks.coordinator.mockReset().mockResolvedValue(() => undefined);
  mocks.readStatus.mockReset();
  mocks.reportStatus.mockReset().mockResolvedValue(undefined);
  mocks.retryOwnership.mockReset().mockReturnValue(connection);
  mocks.startServer.mockReset().mockReturnValue(connection);
  mocks.waitBinding.mockReset().mockResolvedValue('owner');
});

afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  await rm(root, { recursive: true, force: true });
});

it('deduplicates concurrent owner initialization and returns after the sheet is ready', async () => {
  mocks.readStatus.mockResolvedValueOnce(status('starting')).mockResolvedValueOnce(status('ready'));

  await Promise.all([
    ensureNextDevelopmentStylesheet(root, stylesheetFile, {}),
    ensureNextDevelopmentStylesheet(root, stylesheetFile, {}),
  ]);
  mocks.readStatus.mockResolvedValueOnce(status('ready'));
  await ensureNextDevelopmentStylesheet(root, stylesheetFile, {});

  expect(mocks.startServer).toHaveBeenCalledOnce();
  expect(mocks.coordinator).toHaveBeenCalledOnce();
  expect(mocks.coordinator).toHaveBeenCalledWith(root, stylesheetFile, {}, connection, undefined, true);
});

it('joins a remote owner without starting a second scan', async () => {
  mocks.waitBinding.mockResolvedValue('remote');
  mocks.readStatus.mockResolvedValue(status('ready'));

  await expect(ensureNextDevelopmentStylesheet(root, stylesheetFile, {})).resolves.toBeUndefined();
  expect(mocks.coordinator).not.toHaveBeenCalled();
});

it('waits for a remote owner that is still initializing', async () => {
  mocks.waitBinding.mockResolvedValue('remote');
  mocks.readStatus.mockResolvedValueOnce(status('starting')).mockResolvedValueOnce(status('ready'));

  await expect(ensureNextDevelopmentStylesheet(root, stylesheetFile, {})).resolves.toBeUndefined();
  expect(mocks.coordinator).not.toHaveBeenCalled();
});

it('surfaces the remote startup error without waiting for the deadline', async () => {
  mocks.waitBinding.mockResolvedValue('remote');
  mocks.readStatus.mockResolvedValue(status('failed', 'theme load', 'theme file is invalid'));

  await expect(ensureNextDevelopmentStylesheet(root, stylesheetFile, {})).rejects.toThrow(
    'theme load: theme file is invalid',
  );
  expect(mocks.retryOwnership).not.toHaveBeenCalled();
});

it('uses a fallback diagnostic when a remote owner omits its startup error', async () => {
  mocks.waitBinding.mockResolvedValue('remote');
  mocks.readStatus.mockResolvedValue(status('failed', 'initial source scan'));

  await expect(ensureNextDevelopmentStylesheet(root, stylesheetFile, {})).rejects.toThrow(
    'initial source scan: unknown error',
  );
});

it('surfaces the owner coordinator error state after startup begins', async () => {
  mocks.readStatus
    .mockResolvedValueOnce(status('starting'))
    .mockResolvedValueOnce(status('failed', 'theme load', 'theme file is invalid'));

  await expect(ensureNextDevelopmentStylesheet(root, stylesheetFile, {})).rejects.toThrow(
    'theme load: theme file is invalid',
  );
  expect(mocks.coordinator).toHaveBeenCalledOnce();
});

it('uses a fallback diagnostic when the owner omits its startup error', async () => {
  mocks.readStatus.mockResolvedValueOnce(status('starting')).mockResolvedValueOnce(status('failed', 'theme load'));

  await expect(ensureNextDevelopmentStylesheet(root, stylesheetFile, {})).rejects.toThrow('theme load: unknown error');
  expect(mocks.coordinator).toHaveBeenCalledOnce();
});

it('retries ownership after a disconnected endpoint and initializes the replacement owner', async () => {
  mocks.waitBinding.mockResolvedValueOnce('remote').mockResolvedValueOnce('owner');
  mocks.readStatus.mockRejectedValueOnce(new Error('ECONNREFUSED')).mockResolvedValueOnce(status('ready'));

  await expect(ensureNextDevelopmentStylesheet(root, stylesheetFile, {})).resolves.toBeUndefined();
  expect(mocks.retryOwnership).toHaveBeenCalledWith(root, stylesheetFile);
  expect(mocks.coordinator).toHaveBeenCalledOnce();
});

it('rejects an endpoint identity mismatch and can bind after the stale owner exits', async () => {
  mocks.waitBinding.mockResolvedValueOnce('remote').mockResolvedValueOnce('owner');
  mocks.readStatus
    .mockResolvedValueOnce({ ...status('starting'), root: '/different-app' })
    .mockResolvedValueOnce(status('ready'));

  await expect(ensureNextDevelopmentStylesheet(root, stylesheetFile, {})).resolves.toBeUndefined();
  expect(mocks.retryOwnership).toHaveBeenCalledOnce();
  expect(mocks.coordinator).toHaveBeenCalledOnce();
});

it('reports coordinator setup errors with the watcher phase', async () => {
  mocks.readStatus.mockResolvedValue(status('starting'));
  mocks.coordinator.mockRejectedValueOnce('watcher failed');
  mocks.reportStatus.mockRejectedValueOnce(new Error('owner disappeared'));

  await expect(ensureNextDevelopmentStylesheet(root, stylesheetFile, {})).rejects.toThrow(
    'CSSX Next.js stylesheet startup failed during watcher setup: watcher failed',
  );
  expect(mocks.reportStatus).toHaveBeenCalledWith(connection, 'watcher setup', 'watcher failed');
});

it('reports coordinator setup errors that are Error objects', async () => {
  mocks.readStatus.mockResolvedValue(status('starting'));
  mocks.coordinator.mockRejectedValueOnce(new Error('watcher setup failed'));

  await expect(ensureNextDevelopmentStylesheet(root, stylesheetFile, {})).rejects.toThrow(
    'CSSX Next.js stylesheet startup failed during watcher setup: watcher setup failed',
  );
  expect(mocks.reportStatus).toHaveBeenCalledWith(connection, 'watcher setup', expect.any(Error));
});

it('retries a non-error binding rejection when the next owner is available', async () => {
  mocks.waitBinding
    .mockRejectedValueOnce('temporary bind failure')
    .mockRejectedValueOnce('temporary rebind failure')
    .mockResolvedValue('owner');
  mocks.readStatus.mockResolvedValueOnce(status('ready'));

  await expect(ensureNextDevelopmentStylesheet(root, stylesheetFile, {})).resolves.toBeUndefined();
  expect(mocks.retryOwnership).toHaveBeenCalledOnce();
  expect(mocks.coordinator).not.toHaveBeenCalled();
});

it('rejoins a remote owner after a temporary rebind failure', async () => {
  mocks.waitBinding.mockResolvedValueOnce('remote').mockResolvedValueOnce('remote');
  mocks.readStatus.mockRejectedValueOnce(new Error('ECONNREFUSED')).mockResolvedValueOnce(status('ready'));

  await expect(ensureNextDevelopmentStylesheet(root, stylesheetFile, {})).resolves.toBeUndefined();
  expect(mocks.retryOwnership).toHaveBeenCalledOnce();
  expect(mocks.coordinator).not.toHaveBeenCalled();
});

it('returns an incompatible port binding error without retrying until the deadline', async () => {
  mocks.waitBinding.mockResolvedValueOnce('remote').mockRejectedValueOnce(new Error('could not own port 45101'));
  mocks.readStatus.mockRejectedValueOnce(new Error('connection refused'));

  await expect(ensureNextDevelopmentStylesheet(root, stylesheetFile, {})).rejects.toThrow('could not own port 45101');
  expect(mocks.retryOwnership).toHaveBeenCalledOnce();
});

it('reports the last phase and connection error when the deadline expires', async () => {
  mocks.readStatus.mockResolvedValue(status('starting'));
  let nowCall = 0;
  vi.spyOn(Date, 'now').mockImplementation(() => (nowCall++ < 2 ? 0 : 30_000));
  vi.spyOn(globalThis, 'setTimeout').mockImplementation(((callback: () => void) => {
    queueMicrotask(callback);
    return 0;
  }) as never);

  await expect(ensureNextDevelopmentStylesheet(root, stylesheetFile, {})).rejects.toThrow(
    'last phase: initial source scan; last error: startup remains in phase initial source scan',
  );
});

function status(state: 'starting' | 'ready' | 'failed', phase = 'initial source scan', error?: string) {
  return {
    protocol: 1 as const,
    root,
    stylesheetFile,
    state,
    phase,
    ...(error === undefined ? {} : { error }),
  };
}
