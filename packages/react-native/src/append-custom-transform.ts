import type { NativeStyleValue, NativeTransform } from './native-types';
import { nativeValue } from './native-values';

/**
 * Appends a CSSX transform composition variable to a React Native style.
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
