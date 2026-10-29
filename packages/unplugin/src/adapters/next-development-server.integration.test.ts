import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it, vi } from 'vitest';

import { nextDevelopmentStylesheetHmr } from './next-development-hmr';
import {
  publishNextDevelopmentStylesheet,
  startNextDevelopmentServer,
  stopNextDevelopmentServer,
  waitForNextDevelopmentStylesheet,
} from './next-development-server';

it('serves the latest sheet and pushes atomic file replacements over an event stream', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-next-hmr-server-'));
  const styleSheetFile = join(root, '.cssx', 'next.css');
  await mkdir(join(root, '.cssx'), { recursive: true });
  await writeFile(styleSheetFile, '.dold{padding:1px;}');
  await writeFile(`${styleSheetFile}.map`, '{"version":3}');
  try {
    const connection = startNextDevelopmentServer(root, styleSheetFile);
    expect(startNextDevelopmentServer(root, styleSheetFile)).toEqual(connection);
    const base = `http://127.0.0.1:${connection.port}/${connection.token}`;
    expect((await retryFetch(`${base}/ready`)).status).toBe(503);
    const events = await retryFetch(`${base}/events`);
    const reader = events.body!.getReader();
    const firstEvent = await reader.read();
    expect(new TextDecoder().decode(firstEvent.value)).toContain('"revision":0');
    const nextEvent = readUntil(reader, '"revision":1');

    await writeFile(styleSheetFile, '.dnew{padding:2px;}');
    await publishNextDevelopmentStylesheet(connection);
    await expect(fetch(`${base}/ready`)).resolves.toMatchObject({ status: 200 });
    const pushedEvent = await nextEvent;
    const pushedData = pushedEvent
      .split('\n')
      .find((line) => line.startsWith('data: '))
      ?.slice(6);
    expect(JSON.parse(pushedData ?? 'null')).toMatchObject({ revision: 1, css: '.dnew{padding:2px;}' });
    await publishNextDevelopmentStylesheet(connection, '.dnew{padding:2px;}');
    const duplicateEvents = await retryFetch(`${base}/events`);
    const duplicateReader = duplicateEvents.body!.getReader();
    expect(new TextDecoder().decode((await duplicateReader.read()).value)).toContain('"revision":1');
    await duplicateReader.cancel();
    const stylesheet = await fetch(`${base}/stylesheet?revision=1`);

    expect(stylesheet.status).toBe(200);
    expect(stylesheet.headers.get('Access-Control-Allow-Origin')).toBe('*');
    await expect(stylesheet.text()).resolves.toBe('.dnew{padding:2px;}');
    const emptyEvent = readUntil(reader, '"revision":2');
    await publishNextDevelopmentStylesheet(connection, '');
    expect(await emptyEvent).toContain('"css":""');
    await expect(fetch(`${base}/stylesheet`)).resolves.toMatchObject({ status: 200 });
    await expect((await fetch(`${base}/stylesheet`)).text()).resolves.toBe('');
    await expect(fetch(`${base}/generated.css.map`)).resolves.toMatchObject({ status: 200 });
    await expect(fetch(`${base}/missing`)).resolves.toMatchObject({ status: 404 });
    await expect(fetch(`${base}/events`, { method: 'OPTIONS' })).resolves.toMatchObject({ status: 204 });
    await expect(fetch(`${base}/publish`, { method: 'POST' })).resolves.toMatchObject({ status: 204 });

    await reader.cancel();
    await expect(
      fetch(`${base}/publish`, {
        method: 'POST',
        headers: { 'X-CSSX-Inline': '1' },
        body: '.dinline{color:green;}',
      }),
    ).resolves.toMatchObject({ status: 204 });
    await expect((await fetch(`${base}/stylesheet`)).text()).resolves.toBe('.dinline{color:green;}');
    await rm(styleSheetFile);
    await expect(fetch(`${base}/stylesheet`)).resolves.toMatchObject({ status: 200 });
    await rm(`${styleSheetFile}.map`);
    await expect(fetch(`${base}/generated.css.map`)).resolves.toMatchObject({ status: 404 });

    const generatedBridge = nextDevelopmentStylesheetHmr(connection);
    expect(generatedBridge).toContain('new EventSource');
    expect(generatedBridge).toContain('state.generatedSheets');
    expect(generatedBridge).toContain('ownerNode?.dataset?.cssxDevelopmentStylesheet');
    expect(generatedBridge).toContain('owner.deleteRule(index)');
    expect(generatedBridge).not.toMatch(/setInterval|location\.reload/);
  } finally {
    stopNextDevelopmentServer(root);
    await rm(root, { recursive: true, force: true });
    stopNextDevelopmentServer(root);
  }
});

it('keeps development stylesheet transports isolated between concurrent apps', async () => {
  const roots = await Promise.all([
    mkdtemp(join(tmpdir(), 'cssx-next-hmr-app-a-')),
    mkdtemp(join(tmpdir(), 'cssx-next-hmr-app-b-')),
  ]);
  const connections = roots.map((root) => startNextDevelopmentServer(root, join(root, '.cssx', 'next.css')));
  try {
    expect(connections[0]).not.toEqual(connections[1]);
    await publishNextDevelopmentStylesheet(connections[0]!, '.dapp-a{color:red;}');
    await publishNextDevelopmentStylesheet(connections[1]!, '.dapp-b{color:blue;}');
    const [firstStylesheet, secondStylesheet] = await Promise.all(
      connections.map(async (connection) => {
        const response = await fetch(`http://127.0.0.1:${connection.port}/${connection.token}/stylesheet`);
        return response.text();
      }),
    );
    expect(firstStylesheet).toBe('.dapp-a{color:red;}');
    expect(secondStylesheet).toBe('.dapp-b{color:blue;}');
  } finally {
    for (const root of roots) {
      stopNextDevelopmentServer(root);
      await rm(root, { recursive: true, force: true });
    }
  }
});

it('limits simultaneous browser event streams per app', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-next-hmr-client-limit-'));
  const connection = startNextDevelopmentServer(root, join(root, '.cssx', 'next.css'));
  const eventsUrl = `http://127.0.0.1:${connection.port}/${connection.token}/events`;
  const readers: ReadableStreamDefaultReader<Uint8Array>[] = [];
  try {
    for (let index = 0; index < 64; index++) {
      const response = await retryFetch(eventsUrl);
      expect(response.status).toBe(200);
      const reader = response.body!.getReader();
      await reader.read();
      readers.push(reader);
    }

    await expect(fetch(eventsUrl)).resolves.toMatchObject({ status: 503 });
  } finally {
    await Promise.all(readers.map((reader) => reader.cancel()));
    stopNextDevelopmentServer(root);
    await rm(root, { recursive: true, force: true });
  }
});

it('returns not-ready responses for missing files and closes event clients on shutdown', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-next-hmr-not-ready-'));
  const styleSheetFile = join(root, '.cssx', 'missing.css');
  const connection = startNextDevelopmentServer(root, styleSheetFile);
  const base = `http://127.0.0.1:${connection.port}/${connection.token}`;
  try {
    expect((await retryFetch(`${base}/stylesheet`)).status).toBe(503);
    expect(
      await fetch(`${base}/publish`, {
        method: 'POST',
        body: 'ignored when inline mode is disabled',
      }),
    ).toMatchObject({ status: 503 });

    const events = await retryFetch(`${base}/events`);
    const reader = events.body!.getReader();
    await reader.read();
    stopNextDevelopmentServer(root);
    await expect(reader.read()).resolves.toMatchObject({ done: true });
  } finally {
    stopNextDevelopmentServer(root);
    stopNextDevelopmentServer(join(root, 'not-started'));
    await rm(root, { recursive: true, force: true });
  }
});

it('retries failed and unavailable stylesheet transports', async () => {
  const originalFetch = globalThis.fetch;
  const connection = { port: 45680, token: 'retry-test' };
  try {
    const retryFetch = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new Error('connection refused'))
      .mockResolvedValueOnce({ status: 204 } as Response);
    globalThis.fetch = retryFetch;
    await expect(publishNextDevelopmentStylesheet(connection, '.dtest{}')).resolves.toBeUndefined();
    expect(retryFetch).toHaveBeenCalledTimes(2);

    const unavailableFetch = vi.fn<typeof fetch>().mockResolvedValue({ status: 503 } as Response);
    globalThis.fetch = unavailableFetch;
    await expect(publishNextDevelopmentStylesheet(connection)).rejects.toThrow(
      'CSSX development stylesheet transport did not become available',
    );
    expect(unavailableFetch).toHaveBeenCalledTimes(20);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

it('waits through startup fetch errors and reports a stylesheet readiness timeout', async () => {
  const originalFetch = globalThis.fetch;
  const connection = { port: 45681, token: 'ready-test' };
  const noDelay = vi.spyOn(globalThis, 'setTimeout').mockImplementation(((callback: () => void) => {
    queueMicrotask(callback);
    return 0;
  }) as never);
  try {
    const startingFetch = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new Error('server starting'))
      .mockResolvedValueOnce({ ok: true } as Response);
    globalThis.fetch = startingFetch;
    await expect(waitForNextDevelopmentStylesheet(connection)).resolves.toBeUndefined();

    globalThis.fetch = vi.fn<typeof fetch>().mockResolvedValue({ ok: false } as Response);
    await expect(waitForNextDevelopmentStylesheet(connection)).rejects.toThrow(
      'did not become ready within 30 seconds',
    );
  } finally {
    noDelay.mockRestore();
    globalThis.fetch = originalFetch;
  }
});

/** Retries while the development server binds its loopback port. */
async function retryFetch(url: string): Promise<Response> {
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      return await fetch(url);
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }
  throw new Error(`Development HMR server did not start at ${url}.`);
}

/** Reads event-stream chunks until the requested server revision is received. */
async function readUntil(reader: ReadableStreamDefaultReader<Uint8Array>, expected: string): Promise<string> {
  const decoder = new TextDecoder();
  let result = '';
  while (!result.includes(expected)) {
    const chunk = await reader.read();
    if (chunk.done) {
      throw new Error('Development HMR event stream closed unexpectedly.');
    }
    result += decoder.decode(chunk.value);
  }
  return result;
}
