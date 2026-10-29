import { expect, it } from 'vitest';

import {
  createViteDevelopmentHtmlHmrMiddleware,
  injectViteDevelopmentHtmlHmr,
  type ViteHtmlRequestLike,
  type ViteHtmlResponseLike,
} from './vite-html-hmr';

function createResponse(initialHeaders: Record<string, string> = {}) {
  const headers = Object.fromEntries(
    Object.entries(initialHeaders).map(([name, value]) => [name.toLowerCase(), value]),
  );
  const chunks: string[] = [];
  const listeners = new Map<string, Array<() => void>>();
  const response: ViteHtmlResponseLike = {
    getHeader(name) {
      return headers[name.toLowerCase()];
    },
    removeHeader(name) {
      delete headers[name.toLowerCase()];
    },
    once(event, listener) {
      const callbacks = listeners.get(event) ?? [];
      callbacks.push(listener);
      listeners.set(event, callbacks);
      return response;
    },
    write(chunk, encodingOrCallback, callback) {
      chunks.push(typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString());
      const done = typeof encodingOrCallback === 'function' ? encodingOrCallback : callback;
      done?.();
      return true;
    },
    end(chunk, encodingOrCallback, callback) {
      if (chunk !== undefined) {
        chunks.push(typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString());
      }
      for (const listener of listeners.get('finish') ?? []) {
        listener();
      }
      const done = typeof encodingOrCallback === 'function' ? encodingOrCallback : callback;
      done?.();
      return response;
    },
  };
  return {
    headers,
    response,
    body: () => chunks.join(''),
    isWrapped: () => (listeners.get('close')?.length ?? 0) > 0,
    close() {
      for (const listener of listeners.get('close') ?? []) {
        listener();
      }
    },
  };
}

function request(
  response: ViteHtmlResponseLike,
  options: ViteHtmlRequestLike = { method: 'GET', headers: { accept: 'text/html' } },
) {
  let continued = false;
  const middleware = createViteDevelopmentHtmlHmrMiddleware('assets/cssx.css', '/preview/');
  middleware(options, response, () => {
    continued = true;
  });
  return { continued, middleware };
}

it('injects the Vite bridge into SSR HTML and removes stale response validators', () => {
  const harness = createResponse({ 'content-type': 'text/html; charset=utf-8', 'content-length': '39', etag: 'old' });
  const { continued } = request(harness.response);
  expect(continued).toBe(true);

  let writeCompleted = false;
  harness.response.write('<html><body>SSR content', () => {
    writeCompleted = true;
  });
  expect(writeCompleted).toBe(true);
  harness.response.end('</body></html>');

  expect(harness.body()).toContain('SSR content<script data-cssx-vite-hmr>');
  expect(harness.body()).toContain('new EventSource("/preview/" + "assets/cssx.css.events")');
  expect(harness.body()).toContain('</script></body></html>');
  expect(writeCompleted).toBe(true);
  expect(harness.headers['content-length']).toBeUndefined();
  expect(harness.headers.etag).toBeUndefined();

  const callbackResponse = createResponse({ 'content-type': 'text/html' });
  request(callbackResponse.response, { method: 'GET', headers: { accept: ['text/html', 'application/xhtml+xml'] } });
  let endCompleted = false;
  callbackResponse.response.write('<html><body>callback');
  callbackResponse.response.end('</body></html>', () => {
    endCompleted = true;
  });
  expect(endCompleted).toBe(true);
  expect(callbackResponse.body()).toContain('callback<script data-cssx-vite-hmr>');
});

it('preserves byte chunks, explicit encodings, and write and end callbacks', () => {
  const harness = createResponse({ 'content-type': 'text/html' });
  request(harness.response);
  let writeCompleted = false;
  let endCompleted = false;
  harness.response.write(Buffer.from('<html><body>bytes'), 'utf8', () => {
    writeCompleted = true;
  });
  harness.response.end(Buffer.from('</body></html>'), 'utf8', () => {
    endCompleted = true;
  });

  expect(harness.body()).toContain('bytes<script data-cssx-vite-hmr>');
  expect(writeCompleted).toBe(true);
  expect(endCompleted).toBe(true);
});

it('does not duplicate an entry-page bridge and supports HTML without body tags', () => {
  const entryHtml = '<html><body><script data-cssx-vite-hmr>existing</script></body></html>';
  expect(injectViteDevelopmentHtmlHmr(entryHtml, 'cssx.css')).toBe(entryHtml);
  const response = createResponse({ 'content-type': 'text/html', 'content-length': '79', etag: 'existing' });
  request(response.response);
  response.response.end(entryHtml);
  expect(response.body()).toBe(entryHtml);
  expect(response.headers['content-length']).toBe('79');
  expect(response.headers.etag).toBe('existing');
  const noBody = injectViteDevelopmentHtmlHmr('<html><p>SSR</p></html>', 'cssx.css');
  expect(noBody).toContain('</script></html>');
  expect(injectViteDevelopmentHtmlHmr('SSR fragment', 'cssx.css')).toContain('</script>');
});

it('passes non-document requests and non-HTML or compressed responses through unchanged', () => {
  const middleware = createViteDevelopmentHtmlHmrMiddleware('cssx.css');
  for (const options of [
    { method: 'POST', headers: { accept: 'text/html' } },
    { method: 'GET', headers: { accept: 'application/json' } },
    { method: 'HEAD', headers: { accept: 'text/html' } },
  ]) {
    const harness = createResponse({ 'content-type': 'text/html' });
    let nextCalled = false;
    middleware(options, harness.response, () => {
      nextCalled = true;
    });
    expect(nextCalled).toBe(true);
  }

  const responseHeaders: Array<Record<string, string>> = [
    { 'content-type': 'text/css' },
    { 'content-type': 'text/html', 'content-encoding': 'gzip' },
    {},
  ];
  for (const headers of responseHeaders) {
    const harness = createResponse(headers);
    request(harness.response);
    harness.response.write('<html><body>unchanged');
    harness.response.end('</body></html>');
    expect(harness.body()).toBe('<html><body>unchanged</body></html>');
  }
});

it('flushes an oversized streamed page without retaining it or changing its bytes', () => {
  const html = 'x'.repeat(1024 * 1024);
  const harness = createResponse({ 'content-type': 'text/html', 'content-length': String(html.length) });
  request(harness.response);
  harness.response.write(html);
  harness.response.end('tail');
  expect(harness.body()).toBe(`${html}tail`);
  expect(harness.body()).not.toContain('data-cssx-vite-hmr');
  expect(harness.headers['content-length']).toBe(String(html.length));

  const writeOverflow = createResponse({ 'content-type': 'text/html' });
  request(writeOverflow.response);
  const oversized = `${html}x`;
  writeOverflow.response.write(oversized);
  writeOverflow.response.write('tail');
  writeOverflow.response.end();
  expect(writeOverflow.body()).toBe(`${oversized}tail`);

  const chunkOverflow = createResponse({ 'content-type': 'text/html' });
  request(chunkOverflow.response);
  for (let index = 0; index < 4097; index++) {
    chunkOverflow.response.write('');
  }
  chunkOverflow.response.end('tail');
  expect(chunkOverflow.body()).toBe('tail');
});

it('preserves callbacks while switching an oversized response to pass-through', () => {
  const html = 'x'.repeat(1024 * 1024 + 1);
  const writeOverflow = createResponse({ 'content-type': 'text/html' });
  request(writeOverflow.response);
  let bufferedWriteCompleted = false;
  let overflowingWriteCompleted = false;
  let passThroughWriteCompleted = false;
  let passThroughEndCompleted = false;
  writeOverflow.response.write('prefix', () => {
    bufferedWriteCompleted = true;
  });
  writeOverflow.response.write(html, () => {
    overflowingWriteCompleted = true;
  });
  writeOverflow.response.write('tail', () => {
    passThroughWriteCompleted = true;
  });
  writeOverflow.response.end('done', () => {
    passThroughEndCompleted = true;
  });
  expect(writeOverflow.body()).toBe(`prefix${html}taildone`);
  expect(bufferedWriteCompleted).toBe(true);
  expect(overflowingWriteCompleted).toBe(true);
  expect(passThroughWriteCompleted).toBe(true);
  expect(passThroughEndCompleted).toBe(true);

  const endOverflow = createResponse({ 'content-type': 'text/html' });
  request(endOverflow.response);
  endOverflow.response.write('prefix');
  let endOverflowCompleted = false;
  endOverflow.response.end(html, () => {
    endOverflowCompleted = true;
  });
  expect(endOverflow.body()).toBe(`prefix${html}`);
  expect(endOverflowCompleted).toBe(true);
});

it('bounds concurrent SSR response buffering and releases slots on completion or disconnect', () => {
  const middleware = createViteDevelopmentHtmlHmrMiddleware('cssx.css');
  const responses = Array.from({ length: 8 }, () => createResponse({ 'content-type': 'text/html' }));
  for (const harness of responses) {
    middleware({ method: 'GET', headers: { accept: 'text/html' } }, harness.response, () => undefined);
  }
  responses[0]!.response.write('buffered before disconnect');
  const extra = createResponse({ 'content-type': 'text/html' });
  let nextCalled = false;
  middleware({ method: 'GET', headers: { accept: 'text/html' } }, extra.response, () => {
    nextCalled = true;
  });
  expect(nextCalled).toBe(true);
  expect(extra.isWrapped()).toBe(false);

  responses[0]!.close();
  responses[0]!.close();
  const afterClose = createResponse({ 'content-type': 'text/html' });
  nextCalled = false;
  middleware({ method: 'GET', headers: { accept: 'text/html' } }, afterClose.response, () => {
    nextCalled = true;
  });
  expect(nextCalled).toBe(true);
  expect(afterClose.isWrapped()).toBe(true);
  afterClose.response.end('<html></html>');
  for (const harness of responses.slice(1)) {
    harness.response.end('<html></html>');
  }
});
