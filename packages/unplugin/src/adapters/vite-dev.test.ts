import { expect, it, vi } from 'vitest';

import { connectViteStylesheetClient, sendViteStyles } from './vite-dev';

function responseHarness() {
  const headers: Record<string, string> = {};
  const writes: string[] = [];
  let close: (() => void) | undefined;
  return {
    headers,
    writes,
    response: {
      setHeader: (name: string, value: string) => (headers[name] = value),
      write: (chunk: string) => writes.push(chunk),
      on: (_event: 'close', listener: () => void) => (close = listener),
    },
    close: () => close?.(),
  };
}

it('streams complete stylesheets and replays the latest successful update after reconnect', () => {
  const server = {};
  const first = responseHarness();

  connectViteStylesheetClient(server, first.response);

  expect(first.headers).toMatchObject({
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  });
  expect(first.writes).toEqual([': connected\n\n']);

  const now = vi.spyOn(Date, 'now').mockReturnValue(456);
  try {
    sendViteStyles(server, '.dclass{padding:1px;}');
    first.close();
    const second = responseHarness();
    connectViteStylesheetClient(server, second.response);
    sendViteStyles(server, '.dclass{padding:2px;}');

    expect(first.writes).toHaveLength(2);
    expect(JSON.parse(first.writes[1]!.slice('data: '.length))).toMatchObject({
      css: '.dclass{padding:1px;}',
      revision: 456,
    });
    expect(second.writes).toHaveLength(3);
    expect(JSON.parse(second.writes[1]!.slice('data: '.length))).toMatchObject({ revision: 456 });
    expect(JSON.parse(second.writes[2]!.slice('data: '.length))).toMatchObject({ revision: 457 });
  } finally {
    now.mockRestore();
  }
});
