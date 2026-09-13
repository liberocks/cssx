import { expect, it } from 'vitest';

import { appendTransform } from './append-transform';
import type { NativeStyleValue } from './native-types';

it('appends translate, rotate, and scale transform channels', () => {
  const style: Record<string, NativeStyleValue> = { transform: [{ translateX: 1 }] };

  expect(appendTransform(style, 'translate', '2px 3px')).toBe(true);
  expect(appendTransform(style, 'rotate', '10deg')).toBe(true);
  expect(appendTransform(style, 'scale', '2')).toBe(true);
  expect(style.transform).toEqual([
    { translateX: 1 },
    { translateX: 2 },
    { translateY: 3 },
    { rotate: '10deg' },
    { scaleX: 2 },
    { scaleY: 2 },
  ]);
});

it('uses transform defaults, defers variable transforms, and rejects unrelated properties', () => {
  const style: Record<string, NativeStyleValue> = {};

  expect(appendTransform(style, 'translate', '4px')).toBe(true);
  expect(appendTransform(style, 'scale', '')).toBe(true);
  expect(appendTransform(style, 'translate', 'var(--x)')).toBe(true);
  expect(appendTransform(style, 'rotate', 'var(--angle)')).toBe(true);
  expect(appendTransform(style, 'scale', 'var(--factor)')).toBe(true);
  expect(appendTransform(style, 'color', 'red')).toBe(false);
  expect(style.transform).toEqual([{ translateX: 4 }, { translateY: 0 }, { scaleX: 0 }, { scaleY: 0 }]);
});
