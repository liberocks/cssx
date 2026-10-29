import { Buffer } from 'node:buffer';

import { viteDevelopmentStylesheetHmr } from './vite-stylesheet-hmr';

/** Limits the body retained while a framework finishes an SSR HTML response. */
const MAX_BUFFERED_HTML_BYTES = 1024 * 1024;
/** Limits retained chunks so empty or highly fragmented responses stay bounded too. */
const MAX_BUFFERED_HTML_CHUNKS = 4096;
/** Limits simultaneous SSR responses buffered for development bridge injection. */
const MAX_BUFFERED_HTML_RESPONSES = 8;
/** Marks a bridge script already inserted by Vite's HTML hook. */
const BRIDGE_MARKER = 'data-cssx-vite-hmr';

/** Callback invoked after one streamed response chunk is written. */
type WriteCallback = (error?: Error | null) => void;
/** Encoding accepted by Node's writable response methods. */
type WriteEncoding = BufferEncoding | WriteCallback;

/** Minimal request fields used to identify browser document requests. */
export interface ViteHtmlRequestLike {
  readonly headers?: { readonly accept?: string | readonly string[] };
  readonly method?: string;
  readonly url?: string;
}

/** Minimal response fields used to add a bridge to a bounded HTML response. */
export interface ViteHtmlResponseLike {
  end(chunk?: string | Uint8Array, encodingOrCallback?: WriteEncoding, callback?: WriteCallback): this;
  getHeader(name: string): number | string | readonly string[] | undefined;
  once(event: 'close' | 'finish', listener: () => void): this;
  removeHeader(name: string): void;
  write(chunk: string | Uint8Array, encodingOrCallback?: WriteEncoding, callback?: WriteCallback): boolean;
}

/** Middleware signature shared by Vite and Node's HTTP server. */
export type ViteHtmlMiddleware = (
  request: ViteHtmlRequestLike,
  response: ViteHtmlResponseLike,
  next: () => void,
) => void;

/** Inserts a development stylesheet bridge into framework-rendered HTML. */
export function injectViteDevelopmentHtmlHmr(html: string, cssFileName: string, baseUrl = '/'): string {
  if (html.includes(BRIDGE_MARKER)) {
    return html;
  }
  const script = `<script ${BRIDGE_MARKER}>${viteDevelopmentStylesheetHmr(cssFileName, baseUrl)}</script>`;
  const bodyClose = /<\/body\s*>/i;
  const htmlClose = /<\/html\s*>/i;
  if (bodyClose.test(html)) {
    return html.replace(bodyClose, (closingTag) => `${script}${closingTag}`);
  }
  if (htmlClose.test(html)) {
    return html.replace(htmlClose, (closingTag) => `${script}${closingTag}`);
  }
  return `${html}${script}`;
}

/** Buffers only bounded browser HTML responses so SSR frameworks can receive the Vite bridge. */
export function createViteDevelopmentHtmlHmrMiddleware(cssFileName: string, baseUrl = '/'): ViteHtmlMiddleware {
  let bufferedResponses = 0;
  return (request, response, next) => {
    const accepts = request.headers?.accept;
    const acceptHeader = Array.isArray(accepts) ? accepts.join(',') : accepts;
    if (
      request.method !== 'GET' ||
      !acceptHeader?.includes('text/html') ||
      bufferedResponses >= MAX_BUFFERED_HTML_RESPONSES
    ) {
      next();
      return;
    }

    bufferedResponses++;
    let released = false;
    const release = () => {
      if (released) {
        return;
      }
      released = true;
      bufferedResponses--;
    };
    const writeOriginal = response.write.bind(response);
    const endOriginal = response.end.bind(response);
    const chunks: Array<{ readonly data: Buffer; readonly callback?: WriteCallback }> = [];
    let bufferedBytes = 0;
    let passThrough = false;

    const forwardBuffered = () => {
      for (let index = 0; index < chunks.length; index++) {
        const { data, callback } = chunks[index]!;
        if (callback) {
          writeOriginal(data, callback);
        } else {
          writeOriginal(data);
        }
      }
      chunks.length = 0;
      bufferedBytes = 0;
    };

    const bufferChunk = (chunk: string | Uint8Array, encoding?: WriteEncoding, callback?: WriteCallback) => {
      const selectedEncoding = typeof encoding === 'string' ? encoding : undefined;
      const data = typeof chunk === 'string' ? Buffer.from(chunk, selectedEncoding) : Buffer.from(chunk);
      if (bufferedBytes + data.byteLength > MAX_BUFFERED_HTML_BYTES || chunks.length >= MAX_BUFFERED_HTML_CHUNKS) {
        passThrough = true;
        forwardBuffered();
        release();
        return false;
      }
      const writeCallback = typeof encoding === 'function' ? encoding : callback;
      chunks.push({ data, ...(writeCallback ? { callback: writeCallback } : {}) });
      bufferedBytes += data.byteLength;
      return true;
    };

    response.once('close', () => {
      chunks.length = 0;
      bufferedBytes = 0;
      release();
    });
    response.once('finish', release);
    response.write = ((chunk: string | Uint8Array, encoding?: WriteEncoding, callback?: WriteCallback) => {
      if (passThrough) {
        return typeof encoding === 'function'
          ? writeOriginal(chunk, encoding)
          : writeOriginal(chunk, encoding, callback);
      }
      if (bufferChunk(chunk, encoding, callback)) {
        return true;
      }
      return typeof encoding === 'function' ? writeOriginal(chunk, encoding) : writeOriginal(chunk, encoding, callback);
    }) as typeof response.write;

    response.end = ((chunk?: string | Uint8Array, encoding?: WriteEncoding, callback?: WriteCallback) => {
      const endCallback = typeof encoding === 'function' ? encoding : callback;
      if (passThrough) {
        return typeof encoding === 'function' ? endOriginal(chunk, encoding) : endOriginal(chunk, encoding, callback);
      }
      if (chunk !== undefined && !bufferChunk(chunk, typeof encoding === 'string' ? encoding : undefined)) {
        return typeof encoding === 'function' ? endOriginal(chunk, encoding) : endOriginal(chunk, encoding, callback);
      }

      const contentType = String(response.getHeader('content-type') ?? '').toLowerCase();
      const contentEncoding = response.getHeader('content-encoding');
      const isHtml = contentType.startsWith('text/html') && contentEncoding === undefined;
      let body = Buffer.concat(
        chunks.map(({ data }) => data),
        bufferedBytes,
      );
      const writeCallbacks = chunks.flatMap(({ callback: writeCallback }) => (writeCallback ? [writeCallback] : []));
      if (isHtml) {
        const html = body.toString('utf8');
        const injected = injectViteDevelopmentHtmlHmr(html, cssFileName, baseUrl);
        if (injected !== html) {
          body = Buffer.from(injected);
          response.removeHeader('content-length');
          response.removeHeader('etag');
        }
      }
      chunks.length = 0;
      bufferedBytes = 0;
      if (endCallback) {
        return endOriginal(body, () => {
          for (const writeCallback of writeCallbacks) {
            writeCallback();
          }
          writeCallbacks.length = 0;
          endCallback();
        });
      }
      if (writeCallbacks.length > 0) {
        response.once('finish', () => {
          for (const writeCallback of writeCallbacks) {
            writeCallback();
          }
          writeCallbacks.length = 0;
        });
      }
      return endOriginal(body);
    }) as typeof response.end;
    next();
  };
}
