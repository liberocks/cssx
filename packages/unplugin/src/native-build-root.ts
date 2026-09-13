/**
 * Resolves the project root attached to a native loader transform context.
 *
 * @param context Native loader transform context.
 * @returns Native project root, when the context is Webpack or Rspack.
 */
export function nativeBuildRoot(context: { getNativeBuildContext?: (() => unknown) | undefined }): string | undefined {
  const native = context.getNativeBuildContext?.() as
    | { readonly framework: 'webpack' | 'rspack'; readonly loaderContext?: { readonly rootContext?: string } }
    | undefined;
  return native && (native.framework === 'webpack' || native.framework === 'rspack')
    ? (native.loaderContext?.rootContext ?? process.cwd())
    : undefined;
}
