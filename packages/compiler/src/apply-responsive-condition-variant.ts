import { resolveThemeValue } from './theme';
import type { CssxTheme } from './theme';
import type { VariantRenderState } from './variant-render-state';

/**
 * Applies a named or arbitrary responsive condition to a render state.
 *
 * @param variant Variant name to resolve as a breakpoint.
 * @param theme Active theme containing named breakpoint tokens.
 * @param state Mutable render state whose at-rules receive the condition.
 * @returns Whether the variant was a valid named or arbitrary breakpoint.
 * @throws When an arbitrary breakpoint is empty or unsafe.
 */
export function applyResponsiveConditionVariant(variant: string, theme: CssxTheme, state: VariantRenderState): boolean {
  if ((variant.startsWith('min-[') || variant.startsWith('max-[')) && variant.endsWith(']')) {
    const value = variant.slice(5, -1);
    if (!value || /[;{}]/.test(value)) {
      throw new Error(`Invalid CSSX responsive variant "${variant}".`);
    }
    state.atRules.push(variant.startsWith('min-') ? `@media (width >= ${value})` : `@media (width < ${value})`);
    return true;
  }

  const isMaximum = variant.startsWith('max-');
  const breakpointName = isMaximum ? variant.slice(4) : variant;
  const breakpoint = resolveThemeValue(theme, `--breakpoint-${breakpointName}`);
  if (!breakpoint) {
    return false;
  }
  state.atRules.push(isMaximum ? `@media (width < ${breakpoint})` : `@media (width >= ${breakpoint})`);
  return true;
}
