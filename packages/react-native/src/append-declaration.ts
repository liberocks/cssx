import { logicalProperties, propertyNames } from './native-properties';
import { appendCustomTransform, appendTransform } from './native-transforms';
import type { NativeStyleValue } from './native-types';
import { nativeValue } from './native-values';

/** A resolved utility declaration consumed by the native compiler. */
export interface NativeDeclaration {
  readonly property: string;
  readonly value: string;
  readonly selectorSuffix?: string;
  readonly atRule?: string;
}

/**
 * Appends one browser-independent CSS declaration to a native style object.
 *
 * @param style Mutable native style output.
 * @param candidate Source utility used for diagnostics.
 * @param declaration Resolved utility declaration.
 * @returns Nothing after the declaration is represented or rejected.
 */
export function appendDeclaration(
  style: Record<string, NativeStyleValue>,
  candidate: string,
  declaration: NativeDeclaration,
): void {
  if (declaration.selectorSuffix || declaration.atRule) {
    throw new Error(`CSSX React Native cannot represent browser-only utility "${candidate}".`);
  }
  if (appendCustomTransform(style, declaration.property, declaration.value, candidate)) {
    return;
  }
  if (appendTransform(style, declaration.property, declaration.value)) {
    return;
  }
  const logical = logicalProperties[declaration.property];
  if (logical) {
    const value = nativeValue(declaration.value, candidate);
    for (const property of logical) {
      style[property] = value;
    }
    return;
  }
  const property = propertyNames[declaration.property];
  if (!property) {
    throw new Error(
      `CSSX React Native cannot represent "${candidate}" because ${declaration.property} is browser-only.`,
    );
  }
  const value = nativeValue(declaration.value, candidate);
  if (property === 'display' && value !== 'flex' && value !== 'none') {
    throw new Error(`CSSX React Native cannot represent display value "${String(value)}" from "${candidate}".`);
  }
  if (property === 'overflow' && value !== 'visible' && value !== 'hidden') {
    throw new Error(`CSSX React Native cannot represent overflow value "${String(value)}" from "${candidate}".`);
  }
  style[property] = property === 'flex' && typeof value === 'string' ? Number.parseFloat(value) : value;
}
