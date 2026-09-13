/** Wraps CSS in the configured layer when one is set. */
export function wrapCssLayer(css: string, layer: string | undefined): string {
  return css && layer ? `@layer ${layer}{${css}}` : css;
}
