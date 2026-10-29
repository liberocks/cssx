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

/** Callback invoked after one streamed response chunk is accepted. */
type WriteCallback = (error?: Error | null) => void;
/** Encoding accepted by Node's writable response methods. */
type WriteEncoding = BufferEncoding | WriteCallback;
/** Header values accepted by Node's HTTP/1 response methods. */
type ViteHtmlHeaderValue = number | string | readonly string[];
/** Header object or alternating name/value list accepted by writeHead. */
type ViteHtmlHeaders = Record<string, ViteHtmlHeaderValue | undefined> | readonly ViteHtmlHeaderValue[];

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
  readonly headersSent?: boolean;
  once(event: 'close' | 'finish', listener: () => void): this;
  removeHeader(name: string): void;
  write(chunk: string | Uint8Array, encodingOrCallback?: WriteEncoding, callback?: WriteCallback): boolean;
  writeHead?(statusCode: number, statusMessageOrHeaders?: string | ViteHtmlHeaders, headers?: ViteHtmlHeaders): this;
  flushHeaders?(): void;
}

/** Middleware signature shared by Vite and Node's HTTP server. */
export type ViteHtmlMiddleware = (
  request: ViteHtmlRequestLike,
  response: ViteHtmlResponseLike,
  next: () => void,
) => void;

/** Finds a named header in a writeHead header object or alternating list. */
function headerValue(headers: ViteHtmlHeaders | undefined, name: string): ViteHtmlHeaderValue | undefined {
  if (!headers) {
    return undefined;
  }
  if (Array.isArray(headers)) {
    for (let index = 0; index + 1 < headers.length; index += 2) {
      if (String(headers[index]).toLowerCase() === name) {
        return headers[index + 1];
      }
    }
    return undefined;
  }
  const entry = Object.entries(headers).find(([key]) => key.toLowerCase() === name);
  return entry?.[1];
}

/** Drops validators whose values become stale when the injected bridge changes the HTML. */
function withoutHtmlValidators(headers: ViteHtmlHeaders | undefined): ViteHtmlHeaders | undefined {
  if (!headers) {
    return headers;
  }
  if (Array.isArray(headers)) {
    const cleaned: ViteHtmlHeaderValue[] = [];
    for (let index = 0; index + 1 < headers.length; index += 2) {
      const name = String(headers[index]);
      if (name.toLowerCase() !== 'content-length' && name.toLowerCase() !== 'etag') {
        cleaned.push(headers[index]!, headers[index + 1]!);
      }
    }
    return cleaned;
  }
  return Object.fromEntries(
    Object.entries(headers).filter(
      ([name]) => name.toLowerCase() !== 'content-length' && name.toLowerCase() !== 'etag',
    ),
  );
}

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
    const writeHeadOriginal = response.writeHead?.bind(response);
    const flushHeadersOriginal = response.flushHeaders?.bind(response);
    const chunks: Buffer[] = [];
    let bufferedBytes = 0;
    let passThrough = false;
    let responseContentType = response.getHeader('content-type');
    let responseContentEncoding = response.getHeader('content-encoding');
    let responseContentLength = response.getHeader('content-length');
    let responseEtag = response.getHeader('etag');

    const removeHtmlValidators = () => {
      if (response.headersSent === true) {
        return;
      }
      response.removeHeader('content-length');
      response.removeHeader('etag');
      responseContentLength = undefined;
      responseEtag = undefined;
    };

    if (writeHeadOriginal) {
      response.writeHead = ((statusCode, statusMessageOrHeaders, headers) => {
        const specifiedHeaders = typeof statusMessageOrHeaders === 'string' ? headers : statusMessageOrHeaders;
        responseContentType = headerValue(specifiedHeaders, 'content-type') ?? response.getHeader('content-type');
        responseContentEncoding =
          headerValue(specifiedHeaders, 'content-encoding') ?? response.getHeader('content-encoding');
        responseContentLength = headerValue(specifiedHeaders, 'content-length') ?? response.getHeader('content-length');
        responseEtag = headerValue(specifiedHeaders, 'etag') ?? response.getHeader('etag');
        const isHtml = String(responseContentType ?? '')
          .toLowerCase()
          .startsWith('text/html');
        const shouldInject = isHtml && responseContentEncoding === undefined;
        const outgoingHeaders = shouldInject ? withoutHtmlValidators(specifiedHeaders) : specifiedHeaders;
        if (shouldInject) {
          removeHtmlValidators();
          responseContentLength = undefined;
          responseEtag = undefined;
        }
        if (typeof statusMessageOrHeaders === 'string') {
          return writeHeadOriginal(statusCode, statusMessageOrHeaders, outgoingHeaders);
        }
        return writeHeadOriginal(statusCode, outgoingHeaders);
      }) as typeof response.writeHead;
    }

    if (flushHeadersOriginal) {
      response.flushHeaders = (() => {
        responseContentType = response.getHeader('content-type');
        responseContentEncoding = response.getHeader('content-encoding');
        responseContentLength = response.getHeader('content-length');
        responseEtag = response.getHeader('etag');
        if (
          String(responseContentType ?? '')
            .toLowerCase()
            .startsWith('text/html') &&
          responseContentEncoding === undefined
        ) {
          removeHtmlValidators();
        }
        flushHeadersOriginal();
      }) as typeof response.flushHeaders;
    }

    const forwardBuffered = () => {
      for (const data of chunks) {
        writeOriginal(data);
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
      chunks.push(data);
      bufferedBytes += data.byteLength;
      const writeCallback = typeof encoding === 'function' ? encoding : callback;
      writeCallback?.();
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

      const contentType = String(responseContentType ?? response.getHeader('content-type') ?? '').toLowerCase();
      const contentEncoding = responseContentEncoding ?? response.getHeader('content-encoding');
      const isHtml = contentType.startsWith('text/html') && contentEncoding === undefined;
      let body = Buffer.concat(chunks, bufferedBytes);
      if (isHtml) {
        const html = body.toString('utf8');
        const injected = injectViteDevelopmentHtmlHmr(html, cssFileName, baseUrl);
        if (
          injected !== html &&
          !(response.headersSent === true && (responseContentLength !== undefined || responseEtag !== undefined))
        ) {
          body = Buffer.from(injected);
          removeHtmlValidators();
        }
      }
      chunks.length = 0;
      bufferedBytes = 0;
      if (endCallback) {
        return endOriginal(body, endCallback);
      }
      return endOriginal(body);
    }) as typeof response.end;
    next();
  };
}
