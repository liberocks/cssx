import { expect, it } from 'vitest';

import { appendCustomTransform } from './append-custom-transform';
import type { NativeStyleValue } from './native-types';

it('appends recognized CSSX transform variables as native channels', () => {
  const style: Record<string, NativeStyleValue> = {};

  expect(appendCustomTransform(style, '--cssx-rotate', '12deg', 'rotate-12')).toBe(true);
  expect(appendCustomTransform(style, '--cssx-scale-x', '1.5', 'scale-x-150')).toBe(true);
  expect(appendCustomTransform(style, '--cssx-scale-y', '2', 'scale-y-200')).toBe(true);
  expect(appendCustomTransform(style, '--cssx-translate-x', '1rem', 'translate-x-4')).toBe(true);
  expect(appendCustomTransform(style, '--cssx-translate-y', '2px', 'translate-y-2')).toBe(true);
  expect(style.transform).toEqual([
    { rotate: '12deg' },
    { scaleX: 1.5 },
    { scaleY: 2 },
    { translateX: 16 },
    { translateY: 2 },
  ]);
});

it('leaves unrelated custom properties unhandled', () => {
  expect(appendCustomTransform({}, '--other-channel', '2', 'custom')).toBe(false);
});
