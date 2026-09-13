import { createShadowDeclarations } from './create-shadow-declarations';
import type { UtilityDeclaration } from './utility-types';

/** Fixed box-shadow declarations keyed by their complete utility candidate. */
export const EXACT_SHADOW_DECLARATIONS: Readonly<Record<string, readonly UtilityDeclaration[]>> = {
  shadow: createShadowDeclarations('0 1px 3px 0 rgb(0 0 0 / .1), 0 1px 2px -1px rgb(0 0 0 / .1)'),
  'shadow-none': createShadowDeclarations('0 0 #0000'),
  'shadow-sm': createShadowDeclarations('0 1px 2px 0 rgb(0 0 0 / .05)'),
  'shadow-md': createShadowDeclarations('0 4px 6px -1px rgb(0 0 0 / .1), 0 2px 4px -2px rgb(0 0 0 / .1)'),
  'shadow-lg': createShadowDeclarations('0 10px 15px -3px rgb(0 0 0 / .1), 0 4px 6px -4px rgb(0 0 0 / .1)'),
  'shadow-xl': createShadowDeclarations('0 20px 25px -5px rgb(0 0 0 / .1), 0 8px 10px -6px rgb(0 0 0 / .1)'),
  'shadow-2xl': createShadowDeclarations('0 25px 50px -12px rgb(0 0 0 / .25)'),
};
