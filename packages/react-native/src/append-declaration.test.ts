import { expect, it } from 'vitest';

import { appendDeclaration } from './append-declaration';
import type { NativeStyleValue } from './native-types';

it('maps native-safe, logical, and transform declarations', () => {
  const style: Record<string, NativeStyleValue> = {};
  appendDeclaration(style, 'padding-inline-2', { property: 'padding-inline', value: '2px' });
  appendDeclaration(style, 'translate-x-2', { property: '--cssx-translate-x', value: '1rem' });
  appendDeclaration(style, 'translate', { property: 'translate', value: '2px 3px' });
  appendDeclaration(style, 'flex-1', { property: 'flex', value: '1' });
  appendDeclaration(style, 'font-size', { property: 'font-size', value: '12px' });

  expect(style).toEqual({
    paddingLeft: 2,
    paddingRight: 2,
    transform: [{ translateX: 16 }, { translateX: 2 }, { translateY: 3 }],
    flex: 1,
    fontSize: 12,
  });
});

it('rejects browser-only declarations and unsupported native display values', () => {
  const style: Record<string, NativeStyleValue> = {};

  expect(() =>
    appendDeclaration(style, 'hover:block', { property: 'display', value: 'flex', selectorSuffix: ':hover' }),
  ).toThrow('cannot represent browser-only utility');
  expect(() =>
    appendDeclaration(style, 'responsive:block', { property: 'display', value: 'flex', atRule: '@media' }),
  ).toThrow('cannot represent browser-only utility');
  expect(() => appendDeclaration(style, 'background-image', { property: 'background-image', value: 'none' })).toThrow(
    'background-image is browser-only',
  );
  expect(() => appendDeclaration(style, 'block', { property: 'display', value: 'block' })).toThrow('display value');
  expect(() => appendDeclaration(style, 'overflow-scroll', { property: 'overflow', value: 'scroll' })).toThrow(
    'overflow value',
  );
});

it('keeps supported display and overflow values and numeric flex conversion', () => {
  const style: Record<string, NativeStyleValue> = {};
  appendDeclaration(style, 'flex', { property: 'display', value: 'flex' });
  appendDeclaration(style, 'hidden', { property: 'display', value: 'none' });
  appendDeclaration(style, 'overflow-hidden', { property: 'overflow', value: 'hidden' });
  appendDeclaration(style, 'flex-auto', { property: 'flex', value: 'auto' });
  expect(Number.isNaN(style.flex)).toBe(true);
  appendDeclaration(style, 'flex-2', { property: 'flex', value: '2' });

  expect(style.display).toBe('none');
  expect(style.overflow).toBe('hidden');
  expect(style.flex).toBe(2);
});
