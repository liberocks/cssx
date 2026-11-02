import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';

import {
  publishNextDevelopmentStylesheet,
  readNextDevelopmentStylesheetStatus,
  reportNextDevelopmentStartupStatus,
  retryNextDevelopmentServerOwnership,
  stopNextDevelopmentServer,
  waitForNextDevelopmentServerBinding,
  waitForNextDevelopmentStylesheet,
} from '../../packages/unplugin/src/adapters/next-development-server';

afterEach(() => vi.unstubAllGlobals());

it('returns the remote startup phase and original scan error immediately', async () => {
  const fetchMock = vi.fn<typeof fetch>().mockResolvedValue({
    status: 500,
    ok: false,
    json: async () => ({
      protocol: 1,
      root: '/app',
      stylesheetFile: '/app/.cssx/next.css',
      state: 'failed',
      phase: 'initial source scan',
      error: 'SyntaxError: unexpected token',
    }),
  } as Response);
  vi.stubGlobal('fetch', fetchMock);

  await expect(waitForNextDevelopmentStylesheet({ port: 45_001, token: 'app' })).rejects.toThrow(
    'initial source scan: SyntaxError: unexpected token',
  );
  expect(fetchMock).toHaveBeenCalledOnce();
});

it('validates the identity response before a worker reuses the endpoint', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof fetch>().mockResolvedValue({ json: async () => ({ state: 'ready' }) } as Response),
  );

  await expect(readNextDevelopmentStylesheetStatus({ port: 45_002, token: 'app' })).rejects.toThrow(
    'returned an invalid status',
  );
});

it('uses fallback details when a failed readiness response omits its phase and error', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof fetch>().mockResolvedValue({ status: 500, ok: false, json: async () => ({}) } as Response),
  );

  await expect(waitForNextDevelopmentStylesheet({ port: 45_003, token: 'missing-details' })).rejects.toThrow(
    'startup: unknown error',
  );
});

it('reports remote status failures and publishes through a remote connection', async () => {
  const fetchMock = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce({ status: 503 } as Response)
    .mockResolvedValueOnce({ status: 204 } as Response);
  vi.stubGlobal('fetch', fetchMock);
  const connection = { port: 45_004, token: 'remote-publish' };

  await expect(reportNextDevelopmentStartupStatus(connection, 'initial source scan')).rejects.toThrow(
    'could not report development startup status (HTTP 503)',
  );
  await expect(publishNextDevelopmentStylesheet(connection, '.dremote{color:red;}')).resolves.toBeUndefined();
  expect(fetchMock).toHaveBeenNthCalledWith(
    2,
    'http://127.0.0.1:45004/remote-publish/publish',
    expect.objectContaining({ method: 'POST', body: '.dremote{color:red;}' }),
  );
});

it('starts a fresh owner when retry is requested without a local transport', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-next-retry-'));
  try {
    retryNextDevelopmentServerOwnership(root, `${root}/next.css`);
    await expect(waitForNextDevelopmentServerBinding(root)).resolves.toBe('owner');
  } finally {
    stopNextDevelopmentServer(root);
    await rm(root, { recursive: true, force: true });
  }
});
