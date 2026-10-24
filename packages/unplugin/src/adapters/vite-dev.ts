/** The part of a development server used to notify connected clients. */
interface ViteStyleNotifier {
  /** WebSocket transport for native development-server updates. */
  readonly ws: {
    /**
     * Sends one stylesheet update to connected clients.
     *
     * @param payload Update details.
     * @param payload.type Update category.
     * @param payload.updates Stylesheet updates handled by Vite's browser client.
     * @returns Nothing after the event is sent.
     */
    send(payload: {
      /** Marks this as a standard Vite update. */
      readonly type: 'update';
      /** CSS asset update handled by Vite's built-in client. */
      readonly updates: readonly {
        readonly type: 'css-update';
        readonly path: string;
        readonly acceptedPath: string;
        readonly timestamp: number;
      }[];
    }): void;
  };
}

/**
 * Requests stylesheet-link refreshes after an extracted CSS change.
 *
 * @param server Development server that broadcasts native updates.
 * @param path Development URL of the extracted stylesheet.
 * @returns Nothing after the refresh event is sent.
 */
export function sendViteStyles(server: ViteStyleNotifier, path: string, timestamp = Date.now()): void {
  server.ws.send({
    type: 'update',
    updates: [{ type: 'css-update', path, acceptedPath: path, timestamp }],
  });
}
