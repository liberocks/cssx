export { cloneDeclarations } from './clone-declarations';

/**
 * Splits declarations into independently composable class atoms.
 *
 * Related selector-scoped declarations stay together. Transform channels also
 * keep their sink declaration so an atom remains valid when a later utility
 * replaces only one axis. This is the invariant that lets compiled conflicts use
 * property-level replacement without producing incomplete CSS.
 *
 * @param declarations Ordered declarations from one utility.
 * @returns Declaration groups that can receive separate class names.
 */
export { atomizeDeclarations } from './atomize-declarations';

/**
 * Resolves a supported line-height name or arbitrary value.
 *
 * @param value Utility value.
 * @returns CSS line-height value.
 */
export { leadingValue } from './leading-value';

/**
 * Resolves a supported letter-spacing name.
 *
 * @param value Utility value.
 * @returns CSS letter-spacing value.
 */
export { trackingValue } from './tracking-value';

/**
 * Converts a duration utility value to milliseconds when needed.
 *
 * @param value Utility value.
 * @returns CSS duration value.
 */
export { millisecondsValue } from './milliseconds-value';

/**
 * Resolves a degree or arbitrary angle value.
 *
 * @param value Utility value.
 * @param negative Whether to negate the value.
 * @returns CSS angle, or null when unsupported.
 */
export { resolveAngleValue } from './resolve-angle-value';

/**
 * Resolves a percentage scale utility value.
 *
 * @param value Utility value.
 * @param negative Whether to negate the value.
 * @returns CSS scale number, or null when unsupported.
 */
export { resolveScaleValue } from './resolve-scale-value';
