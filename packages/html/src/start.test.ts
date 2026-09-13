import { expect, it } from 'vitest';

import { start } from './start';

it('compiles page utilities into a new stylesheet or updates an existing one', async () => {
  const style = {
    textContent: '',
    setAttribute() {},
  } as unknown as HTMLStyleElement;
  const appended: HTMLStyleElement[] = [];
  let existing: HTMLStyleElement | null = null;
  const document = {
    querySelectorAll: () => [{ getAttribute: () => 'p-4' }],
    createElement: () => style,
    head: {
      querySelector: () => existing,
      append: (element: HTMLStyleElement) => appended.push(element),
    },
  } as unknown as Document;

  const first = await start({ document, theme: '', darkMode: 'selector' });
  expect(first).toBe(style);
  expect(first.textContent).toContain('.p-4{padding:calc(0.25rem * 4);}');
  expect(appended).toEqual([style]);

  existing = style;
  expect(await start({ document })).toBe(style);
  expect(appended).toEqual([style]);
});
