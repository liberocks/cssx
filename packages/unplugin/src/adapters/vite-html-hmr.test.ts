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
  let headersSent = false;
  const response: ViteHtmlResponseLike = {
    getHeader(name) {
      return headers[name.toLowerCase()];
    },
    get headersSent() {
      return headersSent;
    },
    removeHeader(name) {
      if (headersSent) {
        throw new Error('Headers are already sent.');
      }
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
      headersSent = true;
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
    writeHead(_statusCode, statusMessageOrHeaders, headersArgument) {
      const outgoingHeaders = typeof statusMessageOrHeaders === 'string' ? headersArgument : statusMessageOrHeaders;
      if (Array.isArray(outgoingHeaders)) {
        for (let index = 0; index + 1 < outgoingHeaders.length; index += 2) {
          headers[String(outgoingHeaders[index]).toLowerCase()] = String(outgoingHeaders[index + 1]);
        }
      } else {
        for (const [name, value] of Object.entries(outgoingHeaders ?? {})) {
          if (value !== undefined) {
            headers[name.toLowerCase()] = String(value);
          }
        }
      }
      headersSent = true;
      return response;
    },
    flushHeaders() {
      headersSent = true;
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

it('removes HTML validators before SSR servers commit headers', () => {
  const objectHeaders = createResponse();
  request(objectHeaders.response);
  objectHeaders.response.writeHead!(200, {
    'Content-Type': 'text/html',
    'Content-Length': '80',
    ETag: 'old',
  });
  objectHeaders.response.write('<html><body>object headers');
  objectHeaders.response.end('</body></html>');
  expect(objectHeaders.body()).toContain('object headers<script data-cssx-vite-hmr>');
  expect(objectHeaders.headers['content-length']).toBeUndefined();
  expect(objectHeaders.headers.etag).toBeUndefined();

  const inheritedHeaders = createResponse({ 'content-type': 'text/html', 'content-length': '80', etag: 'old' });
  request(inheritedHeaders.response);
  inheritedHeaders.response.writeHead!(200);
  inheritedHeaders.response.write('<html><body>inherited headers');
  inheritedHeaders.response.end('</body></html>');
  expect(inheritedHeaders.body()).toContain('inherited headers<script data-cssx-vite-hmr>');
  expect(inheritedHeaders.headers['content-length']).toBeUndefined();
  expect(inheritedHeaders.headers.etag).toBeUndefined();

  const withoutContentType = createResponse();
  request(withoutContentType.response);
  withoutContentType.response.writeHead!(200);
  withoutContentType.response.write('<html><body>untyped');
  withoutContentType.response.end('</body></html>');
  expect(withoutContentType.body()).toBe('<html><body>untyped</body></html>');

  const rawHeaders = createResponse();
  request(rawHeaders.response);
  rawHeaders.response.writeHead!(200, 'OK', ['Content-Type', 'text/html', 'Content-Length', '80', 'ETag', 'old']);
  rawHeaders.response.write('<html><body>raw headers');
  rawHeaders.response.end('</body></html>');
  expect(rawHeaders.body()).toContain('raw headers<script data-cssx-vite-hmr>');
  expect(rawHeaders.headers['content-length']).toBeUndefined();
  expect(rawHeaders.headers.etag).toBeUndefined();

  const flushedHeaders = createResponse({ 'content-type': 'text/html', 'content-length': '80', etag: 'old' });
  request(flushedHeaders.response);
  flushedHeaders.response.flushHeaders!();
  flushedHeaders.response.write('<html><body>flushed headers');
  flushedHeaders.response.end('</body></html>');
  expect(flushedHeaders.body()).toContain('flushed headers<script data-cssx-vite-hmr>');
  expect(flushedHeaders.headers['content-length']).toBeUndefined();
  expect(flushedHeaders.headers.etag).toBeUndefined();

  const compressed = createResponse();
  request(compressed.response);
  compressed.response.writeHead!(200, {
    'Content-Type': 'text/html',
    'Content-Encoding': 'gzip',
    'Content-Length': '80',
    ETag: 'compressed',
  });
  compressed.response.write('<html><body>compressed');
  compressed.response.end('</body></html>');
  expect(compressed.body()).toBe('<html><body>compressed</body></html>');
  expect(compressed.headers['content-length']).toBe('80');
  expect(compressed.headers.etag).toBe('compressed');

  const compressedFlush = createResponse({
    'content-type': 'text/html',
    'content-encoding': 'gzip',
    'content-length': '80',
    etag: 'compressed',
  });
  request(compressedFlush.response);
  compressedFlush.response.flushHeaders!();
  compressedFlush.response.write('<html><body>compressed');
  compressedFlush.response.end('</body></html>');
  expect(compressedFlush.body()).toBe('<html><body>compressed</body></html>');
  expect(compressedFlush.headers['content-length']).toBe('80');
  expect(compressedFlush.headers.etag).toBe('compressed');

  const flushedWithoutContentType = createResponse();
  request(flushedWithoutContentType.response);
  flushedWithoutContentType.response.flushHeaders!();
  flushedWithoutContentType.response.write('<html><body>untyped flush');
  flushedWithoutContentType.response.end('</body></html>');
  expect(flushedWithoutContentType.body()).toBe('<html><body>untyped flush</body></html>');

  const withoutFlushHeaders = createResponse({ 'content-type': 'text/html' });
  delete withoutFlushHeaders.response.flushHeaders;
  request(withoutFlushHeaders.response);
  withoutFlushHeaders.response.write('<html><body>no flush method');
  withoutFlushHeaders.response.end('</body></html>');
  expect(withoutFlushHeaders.body()).toContain('no flush method<script data-cssx-vite-hmr>');
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
