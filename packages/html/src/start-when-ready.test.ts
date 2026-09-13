import { afterEach, expect, it, vi } from 'vitest';

import { startWhenReady } from './start-when-ready';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it('reports asynchronous startup failures without throwing synchronously', async () => {
  vi.stubGlobal('document', undefined);
  const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

  expect(() => startWhenReady()).not.toThrow();
  await vi.waitFor(() =>
    expect(error).toHaveBeenCalledWith('@cssxio/html could not compile the page classes.', expect.any(Error)),
  );
});
