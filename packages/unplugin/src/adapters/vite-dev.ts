/** Writable response used by one connected browser stylesheet stream. */
export interface ViteStylesheetStream {
  /** Writes one SSE frame to the connected browser. */
  write(chunk: string): void;
  /** Sets response headers before streaming starts. */
  setHeader(name: string, value: string): void;
  /** Registers cleanup when the browser disconnects. */
  on(event: 'close', listener: () => void): void;
}

/**
 *
 */
interface StylesheetUpdate {
  readonly css: string;
  readonly revision: number;
}

/**
 *
 */
interface ViteStylesheetState {
  revision: number;
  latest?: StylesheetUpdate;
  readonly clients: Set<ViteStylesheetStream>;
}

/**
 *
 */
const stateByServer = new WeakMap<object, ViteStylesheetState>();

/**
 *
 */
function stateFor(server: object): ViteStylesheetState {
  let state = stateByServer.get(server);
  if (!state) {
    state = { revision: 0, clients: new Set() };
    stateByServer.set(server, state);
  }
  return state;
}

/**
 *
 */
function writeStylesheetUpdate(client: ViteStylesheetStream, update: StylesheetUpdate): void {
  client.write(`data: ${JSON.stringify(update)}\n\n`);
}

/** Registers a browser on the Vite development stylesheet stream. */
export function connectViteStylesheetClient(server: object, client: ViteStylesheetStream): void {
  const state = stateFor(server);
  client.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  client.setHeader('Cache-Control', 'no-cache, no-transform');
  client.setHeader('Connection', 'keep-alive');
  state.clients.add(client);
  client.write(': connected\n\n');
  if (state.latest) {
    writeStylesheetUpdate(client, state.latest);
  }
  client.on('close', () => state.clients.delete(client));
}

/** Pushes a complete stylesheet update to every connected development browser. */
export function sendViteStyles(server: object, css: string): void {
  const state = stateFor(server);
  const update = {
    css,
    revision: Math.max(Date.now(), state.revision + 1),
  };
  state.revision = update.revision;
  state.latest = update;
  for (const client of state.clients) {
    writeStylesheetUpdate(client, update);
  }
}
