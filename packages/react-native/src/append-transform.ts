import type { NativeStyleValue, NativeTransform } from './native-types';
import { nativeValue } from './native-values';

/**
 * Appends a standard CSS transform declaration to a React Native style.
 *
 * @param style Mutable style output.
 * @param property CSS declaration property.
 * @param value Resolved CSS declaration value.
 * @returns Whether the declaration was represented as a native transform.
 */
export function appendTransform(style: Record<string, NativeStyleValue>, property: string, value: string): boolean {
  if ((property === 'translate' || property === 'rotate' || property === 'scale') && value.includes('var(')) {
    return true;
  }
  let transforms: NativeTransform[] | undefined;
  if (property === 'translate') {
    const x = value.split(' ', 1).join('');
    const [y = '0'] = value.split(' ').slice(1);
    transforms = [{ translateX: nativeValue(x, 'translate') }, { translateY: nativeValue(y, 'translate') }];
  } else if (property === 'rotate') {
    transforms = [{ rotate: value }];
  } else if (property === 'scale') {
    const x = value.split(' ', 1).join('');
    const [y = x] = value.split(' ').slice(1);
    transforms = [{ scaleX: Number(x) }, { scaleY: Number(y) }];
  }
  if (!transforms) {
    return false;
  }
  style.transform = [...((style.transform as readonly NativeTransform[] | undefined) ?? []), ...transforms];
  return true;
}
