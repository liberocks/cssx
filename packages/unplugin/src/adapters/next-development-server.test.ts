import { EventEmitter } from 'node:events';
import type { ServerResponse } from 'node:http';
import { expect, it, vi } from 'vitest';

import { writeNextDevelopmentEvent } from './next-development-server';

class ResponseHarness extends EventEmitter {
  readonly writes: string[] = [];
  readonly write = vi.fn((event: string) => {
    this.writes.push(event);
    return this.writes.length > 1;
  });
}

it('keeps only the newest event while a development client is backpressured', () => {
  const client = new ResponseHarness() as unknown as ServerResponse;
  const state = {
    clients: new Set([client]),
    blockedClients: new Map<ServerResponse, number>(),
    revision: 4,
    latestCss: '.dlatest{color:red}',
  };

  writeNextDevelopmentEvent(state as never, client, 'first revision');
  state.revision = 5;
  state.latestCss = '.dlatest{color:blue}';
  writeNextDevelopmentEvent(state as never, client, 'intermediate revision');
  expect(client.write).toHaveBeenCalledOnce();
  expect(state.blockedClients.has(client)).toBe(true);

  (client as unknown as EventEmitter).emit('drain');

  expect(client.write).toHaveBeenCalledTimes(2);
  expect((client as unknown as ResponseHarness).writes[1]).toContain('"revision":5');
  expect((client as unknown as ResponseHarness).writes[1]).toContain('.dlatest{color:blue}');
  expect(state.blockedClients.has(client)).toBe(false);
});

it('does not resend an unchanged revision after a backpressured write drains', () => {
  const client = new ResponseHarness() as unknown as ServerResponse;
  const state = {
    clients: new Set([client]),
    blockedClients: new Map<ServerResponse, number>(),
    revision: 1,
    latestCss: '.dlatest{}',
  };

  writeNextDevelopmentEvent(state as never, client, 'revision 1');
  expect(state.blockedClients.get(client)).toBe(1);

  (client as unknown as EventEmitter).emit('drain');

  expect(client.write).toHaveBeenCalledOnce();
  expect(state.blockedClients.has(client)).toBe(false);
});

it('drops pending development events after a client disconnects', () => {
  const client = new ResponseHarness() as unknown as ServerResponse;
  const state = {
    clients: new Set([client]),
    blockedClients: new Map<ServerResponse, number>(),
    revision: 1,
    latestCss: '.dlatest{}',
  };

  writeNextDevelopmentEvent(state as never, client, 'first revision');
  state.clients.delete(client);
  (client as unknown as EventEmitter).emit('drain');

  expect(client.write).toHaveBeenCalledOnce();
  expect(state.blockedClients.has(client)).toBe(false);
});
