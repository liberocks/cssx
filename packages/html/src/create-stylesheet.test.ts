import { expect, it, vi } from 'vitest';

import { createStylesheet } from './create-stylesheet';
import { RUNTIME_STYLESHEET_ATTRIBUTE } from './runtime-constants';

it('marks a new style element and appends it to the document head', () => {
  const style = { setAttribute: vi.fn() } as unknown as HTMLStyleElement;
  const append = vi.fn();
  const document = {
    createElement: vi.fn(() => style),
    head: { append },
  } as unknown as Document;

  expect(createStylesheet(document)).toBe(style);
  expect(document.createElement).toHaveBeenCalledWith('style');
  expect(style.setAttribute).toHaveBeenCalledWith(RUNTIME_STYLESHEET_ATTRIBUTE, '');
  expect(append).toHaveBeenCalledWith(style);
});
