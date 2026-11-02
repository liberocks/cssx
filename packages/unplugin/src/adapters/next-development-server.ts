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
  readonly projectRoot: string;
  readonly stylesheetFile: string;
  server?: import('node:http').Server;
  readonly clients: Set<import('node:http').ServerResponse>;
  readonly blockedClients: Map<import('node:http').ServerResponse, number>;
  references: number;
  revision: number;
  ready: boolean;
  binding: 'pending' | 'owner' | 'remote' | 'failed';
  bindingPromise: Promise<'owner' | 'remote'>;
  resolveBinding: (binding: 'owner' | 'remote') => void;
  rejectBinding: (error: Error) => void;
  bindingError?: Error;
  startupPhase: string;
  startupError?: string;
  latestCss?: string;
}

/** Current remote-visible status of the initial stylesheet startup. */
export interface NextDevelopmentStylesheetStatus {
  readonly protocol: 1;
  readonly root: string;
  readonly stylesheetFile: string;
  readonly state: 'starting' | 'ready' | 'failed';
  readonly phase: string;
  readonly error?: string;
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
  let resolveBinding!: (binding: 'owner' | 'remote') => void;
  let rejectBinding!: (error: Error) => void;
  const bindingPromise = new Promise<'owner' | 'remote'>((resolveBindingPromise, rejectBindingPromise) => {
    resolveBinding = resolveBindingPromise;
    rejectBinding = rejectBindingPromise;
  });
  void bindingPromise.catch(() => undefined);
  const state: DevelopmentServerState = {
    connection,
    projectRoot,
    stylesheetFile: filePath,
    revision: 0,
    ready: false,
    binding: 'pending',
    bindingPromise,
    resolveBinding,
    rejectBinding,
    startupPhase: 'transport binding',
    clients,
    blockedClients: new Map(),
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
    if (request.method === 'POST' && pathname === `${basePath}/status`) {
      void readRequestBody(request).then(
        (body) => {
          try {
            const update = JSON.parse(body) as { phase?: unknown; error?: unknown };
            state.startupPhase = typeof update.phase === 'string' ? update.phase : state.startupPhase;
            state.startupError = typeof update.error === 'string' ? update.error : undefined;
            response.writeHead(204, corsHeaders());
            response.end();
          } catch {
            response.writeHead(400, corsHeaders());
            response.end();
          }
        },
        () => {
          response.writeHead(400, corsHeaders());
          response.end();
        },
      );
      return;
    }
    if (request.method === 'GET' && pathname === `${basePath}/ready`) {
      const status = statusForState(state);
      const code = status.state === 'ready' ? 200 : status.state === 'failed' ? 500 : 503;
      response.writeHead(code, { ...corsHeaders(), 'Content-Type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify(status));
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
  server.on('error', (error: NodeJS.ErrnoException) => {
    if (state.binding !== 'pending') {
      return;
    }
    if (error.code === 'EADDRINUSE') {
      void adoptCompatibleServer(state);
      return;
    }
    failBinding(state, new Error(transportErrorMessage(state, error)));
  });
  state.server = server;
  server.once('listening', () => {
    if (state.binding !== 'pending') {
      closeServer(server);
      return;
    }
    state.binding = 'owner';
    state.resolveBinding('owner');
  });
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
  if (state.binding === 'pending') {
    failBinding(state, new Error(`CSSX development stylesheet transport for ${state.projectRoot} was stopped.`));
  } else {
    closeServer(state.server);
  }
  developmentServers.delete(resolve(root));
  developmentServersByConnection.delete(connectionKey(state.connection));
}

/** Waits until this worker owns the endpoint or has verified another CSSX worker owns it. */
export async function waitForNextDevelopmentServerBinding(root: string): Promise<'owner' | 'remote'> {
  const state = developmentServers.get(resolve(root));
  if (!state) {
    throw new Error(`CSSX development stylesheet transport was not started for ${resolve(root)}.`);
  }
  return state.bindingPromise;
}

/** Retries endpoint ownership after a previously verified owner becomes unreachable. */
export function retryNextDevelopmentServerOwnership(
  root: string,
  styleSheetFile: string,
): NextDevelopmentHmrConnection {
  const projectRoot = resolve(root);
  const state = developmentServers.get(projectRoot);
  if (state && state.binding !== 'remote' && state.binding !== 'failed') {
    return state.connection;
  }
  if (state) {
    closeServer(state.server);
    developmentServers.delete(projectRoot);
    developmentServersByConnection.delete(connectionKey(state.connection));
  }
  return startNextDevelopmentServer(projectRoot, styleSheetFile);
}

/** Marks the startup phase or failure visible to root-layout loaders in other workers. */
export async function reportNextDevelopmentStartupStatus(
  connection: NextDevelopmentHmrConnection,
  phase: string,
  error?: unknown,
): Promise<void> {
  const state = developmentServersByConnection.get(connectionKey(connection));
  if (state?.binding === 'owner') {
    state.startupPhase = phase;
    state.startupError = error === undefined ? undefined : errorText(error);
    return;
  }
  const response = await fetch(`http://127.0.0.1:${connection.port}/${connection.token}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phase, ...(error === undefined ? {} : { error: errorText(error) }) }),
    signal: AbortSignal.timeout(1_000),
  });
  if (response.status !== 204) {
    throw new Error(`CSSX could not report development startup status (HTTP ${response.status}).`);
  }
}

/** Reads the owner identity and initial stylesheet status with a bounded request. */
export async function readNextDevelopmentStylesheetStatus(
  connection: NextDevelopmentHmrConnection,
): Promise<NextDevelopmentStylesheetStatus> {
  const response = await fetch(`http://127.0.0.1:${connection.port}/${connection.token}/ready`, {
    cache: 'no-store',
    signal: AbortSignal.timeout(1_000),
  });
  const value: unknown = await response.json();
  if (!isStylesheetStatus(value)) {
    throw new Error(`CSSX development stylesheet endpoint on port ${connection.port} returned an invalid status.`);
  }
  return value;
}

/** Pushes a revision after the loader atomically replaces the generated sheet. */
export async function publishNextDevelopmentStylesheet(
  connection: NextDevelopmentHmrConnection,
  css?: string,
): Promise<void> {
  const localServer = developmentServersByConnection.get(connectionKey(connection));
  if (localServer) {
    const binding = await localServer.bindingPromise;
    if (binding === 'remote') {
      return publishRemotely(connection, css);
    }
    const stylesheet = css ?? (await readFile(localServer.stylesheetFile, 'utf8'));
    publishStylesheet(localServer, stylesheet);
    return;
  }
  return publishRemotely(connection, css);
}

/** Publishes CSS through the verified owner using bounded HTTP retries. */
async function publishRemotely(connection: NextDevelopmentHmrConnection, css?: string): Promise<void> {
  const url = `http://127.0.0.1:${connection.port}/${connection.token}/publish`;
  const request: RequestInit = {
    method: 'POST',
    ...(css === undefined ? {} : { body: css, headers: { 'X-CSSX-Inline': '1' } }),
    signal: AbortSignal.timeout(1_000),
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
    request.on('aborted', () => reject(new Error('CSSX development request body was aborted.')));
    request.on('error', reject);
  });
}

/** Waits until the coordinator has completed its initial stylesheet write. */
export async function waitForNextDevelopmentStylesheet(connection: NextDevelopmentHmrConnection): Promise<void> {
  const url = `http://127.0.0.1:${connection.port}/${connection.token}/ready`;
  const deadline = Date.now() + 30_000;
  let lastError = 'the transport did not return a status';
  for (let attempt = 0; attempt < 300 && Date.now() < deadline; attempt++) {
    try {
      const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(1_000) });
      if (response.ok) {
        return;
      }
      if (response.status === 500) {
        const status = (await response.json()) as Partial<NextDevelopmentStylesheetStatus>;
        throw new Error(
          `CSSX stylesheet startup failed during ${status.phase ?? 'startup'}: ${status.error ?? 'unknown error'}`,
        );
      }
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('CSSX stylesheet startup failed')) {
        throw error;
      }
      lastError = errorText(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(
    `CSSX Next.js development stylesheet did not become ready within 30 seconds (last error: ${lastError}).`,
  );
}

/** Stores the latest stylesheet and notifies clients without buffering stale revisions. */
function publishStylesheet(state: DevelopmentServerState, css: string): void {
  if (state.ready && state.latestCss === css) {
    return;
  }
  state.revision++;
  state.ready = true;
  state.startupPhase = 'ready';
  state.startupError = undefined;
  state.latestCss = css;
  const event = `data: ${JSON.stringify({ revision: state.revision, css })}\n\n`;
  for (const client of state.clients) {
    writeNextDevelopmentEvent(state, client, event);
  }
}

/** Creates the protocol identity and readiness response for this endpoint. */
function statusForState(state: DevelopmentServerState): NextDevelopmentStylesheetStatus {
  return {
    protocol: 1,
    root: state.projectRoot,
    stylesheetFile: state.stylesheetFile,
    state: state.ready ? 'ready' : state.startupError ? 'failed' : 'starting',
    phase: state.startupPhase,
    ...(state.startupError ? { error: state.startupError } : {}),
  };
}

/** Accepts only an occupied endpoint that proves it belongs to this exact app. */
async function adoptCompatibleServer(state: DevelopmentServerState): Promise<void> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(`http://127.0.0.1:${state.connection.port}/${state.connection.token}/ready`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(500),
      });
      const value: unknown = await response.json();
      if (!isStylesheetStatus(value)) {
        throw new Error('the endpoint did not identify itself as a CSSX stylesheet transport');
      }
      if (value.root !== state.projectRoot || value.stylesheetFile !== state.stylesheetFile) {
        throw new Error(`the endpoint belongs to ${value.root} and ${value.stylesheetFile}`);
      }
      closeServer(state.server);
      state.server = undefined;
      state.binding = 'remote';
      state.resolveBinding('remote');
      return;
    } catch (error) {
      lastError = error;
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
    }
  }
  failBinding(state, new Error(transportErrorMessage(state, lastError)));
}

/** Rejects pending owner checks and releases an unbound listener after a bind error. */
function failBinding(state: DevelopmentServerState, error: Error): void {
  state.binding = 'failed';
  state.bindingError = error;
  closeServer(state.server);
  state.server = undefined;
  state.rejectBinding(error);
  console.warn(error.message);
}

/** Adds the app root and deterministic endpoint to a listener failure. */
function transportErrorMessage(state: DevelopmentServerState, error: unknown): string {
  return `CSSX development stylesheet transport for ${state.projectRoot} could not own port ${state.connection.port}: ${errorText(error)}`;
}

/** Closes a bound server and tolerates a socket that lost its initial bind race. */
function closeServer(server: import('node:http').Server | undefined): void {
  if (!server) {
    return;
  }
  try {
    server.close();
  } catch {
    // A server that lost a bind race is not in the listening state.
  }
}

/** Converts thrown values into short diagnostics suitable for the status endpoint. */
function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Guards remote identity data before a worker adopts or trusts the endpoint. */
function isStylesheetStatus(value: unknown): value is NextDevelopmentStylesheetStatus {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const status = value as Partial<NextDevelopmentStylesheetStatus>;
  return (
    status.protocol === 1 &&
    typeof status.root === 'string' &&
    typeof status.stylesheetFile === 'string' &&
    (status.state === 'starting' || status.state === 'ready' || status.state === 'failed') &&
    typeof status.phase === 'string' &&
    (status.error === undefined || typeof status.error === 'string')
  );
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
  const blockedRevision = state.revision;
  state.blockedClients.set(client, blockedRevision);
  client.once('drain', () => {
    state.blockedClients.delete(client);
    if (state.clients.has(client) && state.revision > blockedRevision) {
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
