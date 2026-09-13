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
    const [x = '0', y = '0'] = value.split(' ');
    transforms = [{ translateX: nativeValue(x, 'translate') }, { translateY: nativeValue(y, 'translate') }];
  } else if (property === 'rotate') {
    transforms = [{ rotate: value }];
  } else if (property === 'scale') {
    const [x = '1', y = x] = value.split(' ');
    transforms = [{ scaleX: Number(x) }, { scaleY: Number(y) }];
  }
  if (!transforms) {
    return false;
  }
  style.transform = [...((style.transform as readonly NativeTransform[] | undefined) ?? []), ...transforms];
  return true;
}

/**
 * Appends CSSX transform composition variables to a React Native style.
 *
 * @param style Mutable style output.
 * @param property CSS custom property.
 * @param value Resolved CSS declaration value.
 * @param candidate Source utility used for diagnostics.
 * @returns Whether the custom property was a CSSX transform channel.
 */
export function appendCustomTransform(
  style: Record<string, NativeStyleValue>,
  property: string,
  value: string,
  candidate: string,
): boolean {
  const transformProperty: Readonly<Record<string, string>> = {
    '--cssx-rotate': 'rotate',
    '--cssx-scale-x': 'scaleX',
    '--cssx-scale-y': 'scaleY',
    '--cssx-translate-x': 'translateX',
    '--cssx-translate-y': 'translateY',
  };
  const nativeProperty = transformProperty[property];
  if (!nativeProperty) {
    return false;
  }
  style.transform = [
    ...((style.transform as readonly NativeTransform[] | undefined) ?? []),
    { [nativeProperty]: nativeValue(value, candidate) },
  ];
  return true;
}
