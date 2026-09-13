/// <reference types="astro/client" />
/// <reference types="astro/types" />

/**
 * Astro's generated virtual `.astro.ts` modules are checked by the regular
 * TypeScript language service as JSX. Bridge Astro's HTML element map into the
 * global JSX namespace so editor diagnostics match `astro dev` and `astro
 * build`.
 */
declare namespace JSX {
  // Astro supplies the members; this declaration makes the namespace visible to editors.
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface IntrinsicElements extends astroHTML.JSX.IntrinsicElements {}
}
