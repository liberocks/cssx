import { expect, it, vi } from 'vitest';

import { existingStylesheet } from './existing-stylesheet';
import { RUNTIME_STYLESHEET_ATTRIBUTE } from './runtime-constants';

it('looks up the marked runtime stylesheet and returns null when absent', () => {
  const style = {} as HTMLStyleElement;
  let existing: HTMLStyleElement | null = style;
  const querySelector = vi.fn(() => existing);
  const document = { head: { querySelector } } as unknown as Document;

  expect(existingStylesheet(document)).toBe(style);
  expect(querySelector).toHaveBeenCalledWith(`style[${RUNTIME_STYLESHEET_ATTRIBUTE}]`);

  existing = null;
  expect(existingStylesheet(document)).toBeNull();
});
