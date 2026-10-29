import { Buffer } from 'node:buffer';
import { mkdirSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { IncomingMessage } from 'node:http';
import { dirname, resolve } from 'node:path';

import { nextDevelopmentHmrConnection } from './next-development-connection';

/** Browser connection settings for the local Next.js development stylesheet transport. */
export interface NextDevelopmentHmrConnection {
  /** Loopback port used by the development-only stylesheet endpoint. */
  readonly port: number;
  /** Project-specific endpoint segment. */
  readonly token: string;
}

/** Open event-stream clients subscribed to one stylesheet path. */
interface DevelopmentServerState {
  readonly connection: NextDevelopmentHmrConnection;
  readonly stylesheetFile: string;
  server?: import('node:http').Server;
  readonly clients: Set<import('node:http').ServerResponse>;
  readonly blockedClients: Set<import('node:http').ServerResponse>;
  references: number;
  revision: number;
  ready: boolean;
  latestCss?: string;
}

/** Running development transports indexed by absolute project root. */
const developmentServers = new Map<string, DevelopmentServerState>();
/** Running transports keyed for direct coordinator-to-browser publication. */
const developmentServersByConnection = new Map<string, DevelopmentServerState>();
/** Maximum number of browser event streams retained by one app's development server. */
const MAX_DEVELOPMENT_CLIENTS = 64;

/** Starts a loopback-only event stream and stylesheet endpoint for one Next.js app. */
export function startNextDevelopmentServer(root: string, styleSheetFile: string): NextDevelopmentHmrConnection {
  const projectRoot = resolve(root);
  const existing = developmentServers.get(projectRoot);
  if (existing) {
    existing.references++;
    return existing.connection;
  }

  const connection = nextDevelopmentHmrConnection(projectRoot, styleSheetFile);
  const clients = new Set<import('node:http').ServerResponse>();
  const filePath = resolve(styleSheetFile);
  mkdirSync(dirname(filePath), { recursive: true });
  const state: DevelopmentServerState = {
    connection,
    stylesheetFile: filePath,
    revision: 0,
    ready: false,
    clients,
    blockedClients: new Set(),
    references: 1,
  };
  const server = createServer((request, response) => {
    /* v8 ignore next -- Node's HTTP parser always supplies a URL for parsed requests. */
    const pathname = new URL(request.url ?? '/', 'http://127.0.0.1').pathname;
    const basePath = `/${connection.token}`;
    if (request.method === 'OPTIONS') {
      response.writeHead(204, corsHeaders());
      response.end();
      return;
    }
    if (request.method === 'POST' && pathname === `${basePath}/publish`) {
      void readRequestBody(request)
        .then((body) => (request.headers['x-cssx-inline'] === '1' ? body : readFile(filePath, 'utf8')))
        .then(
          (css) => {
            publishStylesheet(state, css);
            response.writeHead(204, corsHeaders());
            response.end();
          },
          () => {
            response.writeHead(503, corsHeaders());
            response.end();
          },
        );
      return;
    }
    if (request.method === 'GET' && pathname === `${basePath}/ready`) {
      response.writeHead(state.ready ? 200 : 503, corsHeaders());
      response.end();
      return;
    }
    if (request.method === 'GET' && pathname === `${basePath}/events`) {
      if (clients.size >= MAX_DEVELOPMENT_CLIENTS) {
        response.writeHead(503, { ...corsHeaders(), 'Retry-After': '1' });
        response.end();
        return;
      }
      response.writeHead(200, {
        ...corsHeaders(),
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      });
      clients.add(response);
      writeLatestEvent(state, response);
      request.on('close', () => {
        clients.delete(response);
        state.blockedClients.delete(response);
      });
      return;
    }
    if (request.method === 'GET' && pathname === `${basePath}/stylesheet`) {
      void (state.latestCss === undefined ? readFile(filePath, 'utf8') : Promise.resolve(state.latestCss)).then(
        (css) => {
          response.writeHead(200, {
            ...corsHeaders(),
            'Content-Type': 'text/css; charset=utf-8',
            'Cache-Control': 'no-store',
          });
          response.end(css);
        },
        () => {
          response.writeHead(503, { ...corsHeaders(), 'Cache-Control': 'no-store' });
          response.end('CSSX development stylesheet is not ready.');
        },
      );
      return;
    }
    if (request.method === 'GET' && pathname === `${basePath}/generated.css.map`) {
      void readFile(`${filePath}.map`, 'utf8').then(
        (sourceMap) => {
          response.writeHead(200, {
            ...corsHeaders(),
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store',
          });
          response.end(sourceMap);
        },
        () => {
          response.writeHead(404, corsHeaders());
          response.end();
        },
      );
      return;
    }
    response.writeHead(404, corsHeaders());
    response.end();
  });
  /* v8 ignore next -- Port binding conflicts depend on external processes choosing this deterministic port. */
  server.on('error', (error: NodeJS.ErrnoException) => {
    console.warn(`CSSX: development stylesheet transport unavailable on port ${connection.port}: ${error.message}`);
  });
  state.server = server;
  server.listen(connection.port, '127.0.0.1');
  server.unref();

  developmentServers.set(projectRoot, state);
  developmentServersByConnection.set(connectionKey(connection), state);
  return connection;
}

/** Stops one project transport. Used by tests and development config reloads. */
export function stopNextDevelopmentServer(root: string): void {
  const state = developmentServers.get(resolve(root));
  if (!state) {
    return;
  }
  if (state.references > 1) {
    state.references--;
    return;
  }
  for (const client of state.clients) {
    client.end();
  }
  state.blockedClients.clear();
  state.server?.close();
  developmentServers.delete(resolve(root));
  developmentServersByConnection.delete(connectionKey(state.connection));
}

/** Pushes a revision after the loader atomically replaces the generated sheet. */
export async function publishNextDevelopmentStylesheet(
  connection: NextDevelopmentHmrConnection,
  css?: string,
): Promise<void> {
  const localServer = developmentServersByConnection.get(connectionKey(connection));
  if (localServer) {
    const stylesheet = css ?? (await readFile(localServer.stylesheetFile, 'utf8'));
    publishStylesheet(localServer, stylesheet);
    return;
  }
  const url = `http://127.0.0.1:${connection.port}/${connection.token}/publish`;
  const request: RequestInit = {
    method: 'POST',
    ...(css === undefined ? {} : { body: css, headers: { 'X-CSSX-Inline': '1' } }),
  };
  let lastError: unknown;
  for (let attempt = 0; attempt < 20; attempt++) {
    try {
      const response = await fetch(url, request);
      if (response.status === 204) {
        return;
      }
      lastError = new Error(`Unexpected HTTP status ${response.status}.`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`CSSX development stylesheet transport did not become available: ${String(lastError)}`);
}

/** Reads optional stylesheet bytes posted by an in-process build worker. */
function readRequestBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolveBody, reject) => {
    const chunks: Buffer[] = [];
    request.on('data', (chunk: Buffer | string) => chunks.push(Buffer.from(chunk)));
    request.on('end', () => resolveBody(Buffer.concat(chunks).toString('utf8')));
    request.on('error', reject);
  });
}

/** Waits until the coordinator has completed its initial stylesheet write. */
export async function waitForNextDevelopmentStylesheet(connection: NextDevelopmentHmrConnection): Promise<void> {
  const url = `http://127.0.0.1:${connection.port}/${connection.token}/ready`;
  for (let attempt = 0; attempt < 300; attempt++) {
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (response.ok) {
        return;
      }
    } catch {
      // The configured dev server can start before its initial stylesheet scan completes.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('CSSX Next.js development stylesheet did not become ready within 30 seconds.');
}

/** Stores the latest stylesheet and notifies clients without buffering stale revisions. */
function publishStylesheet(state: DevelopmentServerState, css: string): void {
  if (state.ready && state.latestCss === css) {
    return;
  }
  state.revision++;
  state.ready = true;
  state.latestCss = css;
  const event = `data: ${JSON.stringify({ revision: state.revision, css })}\n\n`;
  for (const client of state.clients) {
    writeNextDevelopmentEvent(state, client, event);
  }
}

/** Writes the current revision to a newly connected or resumed client. */
function writeLatestEvent(state: DevelopmentServerState, client: import('node:http').ServerResponse): void {
  writeNextDevelopmentEvent(
    state,
    client,
    `data: ${JSON.stringify({ revision: state.revision, css: state.latestCss })}\n\n`,
  );
}

/** Keeps at most one newest event pending while a browser's response stream is backpressured. */
export function writeNextDevelopmentEvent(
  state: DevelopmentServerState,
  client: import('node:http').ServerResponse,
  event: string,
): void {
  if (state.blockedClients.has(client)) {
    return;
  }
  if (client.write(event)) {
    return;
  }
  state.blockedClients.add(client);
  client.once('drain', () => {
    state.blockedClients.delete(client);
    if (state.clients.has(client)) {
      writeLatestEvent(state, client);
    }
  });
}

/** Stable lookup key for the loopback endpoint connection. */
function connectionKey(connection: NextDevelopmentHmrConnection): string {
  return `${connection.port}:${connection.token}`;
}

/** CORS response headers for the browser's loopback fetch and EventSource. */
function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-CSSX-Inline',
  };
}
