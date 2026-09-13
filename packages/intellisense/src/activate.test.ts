import { expect, it, vi } from 'vitest';

// @ts-expect-error The editor extension ships CommonJS without declaration files.
import { activate } from './activate.js';

it('registers language providers and stores their disposables', () => {
  const completionDisposable = { dispose: vi.fn() };
  const hoverDisposable = { dispose: vi.fn() };
  const editor = {
    languages: {
      registerCompletionItemProvider: vi.fn(() => completionDisposable),
      registerHoverProvider: vi.fn(() => hoverDisposable),
    },
  };
  const subscriptions: unknown[] = [];

  activate({ subscriptions }, editor);

  expect(editor.languages.registerCompletionItemProvider).toHaveBeenCalledWith(
    ['javascript', 'typescript', 'javascriptreact', 'typescriptreact', 'html', 'astro', 'vue', 'svelte'],
    expect.objectContaining({ provideCompletionItems: expect.any(Function) }),
    ' ',
    ':',
    '-',
    '[',
    '/',
  );
  expect(editor.languages.registerHoverProvider).toHaveBeenCalledWith(
    expect.arrayContaining(['vue', 'svelte']),
    expect.objectContaining({ provideHover: expect.any(Function) }),
  );
  expect(subscriptions).toEqual([completionDisposable, hoverDisposable]);
});
