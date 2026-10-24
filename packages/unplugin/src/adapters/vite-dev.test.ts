import { expect, it, vi } from 'vitest';

import { sendViteStyles } from './vite-dev';

it('sends one stylesheet update with the supplied timestamp', () => {
  const send = vi.fn();

  sendViteStyles({ ws: { send } }, '/assets/cssx.css', 123);

  expect(send).toHaveBeenCalledExactlyOnceWith({
    type: 'update',
    updates: [{ type: 'css-update', path: '/assets/cssx.css', acceptedPath: '/assets/cssx.css', timestamp: 123 }],
  });
});

it('uses the current time when no timestamp is supplied', () => {
  const now = vi.spyOn(Date, 'now').mockReturnValue(456);
  const send = vi.fn();

  try {
    sendViteStyles({ ws: { send } }, '/cssx.css');

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ updates: [expect.objectContaining({ timestamp: 456 })] }),
    );
  } finally {
    now.mockRestore();
  }
});
