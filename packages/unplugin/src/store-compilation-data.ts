import type { ModuleWithCssxRules } from './native-types';

/**
 * Stores source metadata on native bundler modules for final asset aggregation.
 *
 * @param context Transform context that may provide native bundler details.
 * @param context.getNativeBuildContext Optional function that returns native build details.
 * @param data CSSX data collected from the transformed source module.
 * @param metadataKey Key used to retain the data on the module.
 * @returns Nothing when the context is not a native bundler context.
 */
export function storeCompilationData(
  context: { getNativeBuildContext?: (() => unknown) | undefined },
  data: unknown,
  metadataKey: string,
): void {
  const native = context.getNativeBuildContext?.() as
    | { readonly framework: 'webpack' | 'rspack'; readonly loaderContext?: { readonly _module?: ModuleWithCssxRules } }
    | undefined;
  if (!native || (native.framework !== 'webpack' && native.framework !== 'rspack')) {
    return;
  }
  const module = native.loaderContext?._module;
  if (!module) {
    return;
  }
  const buildInfo = module.buildInfo ?? (module.buildInfo = {});
  buildInfo[metadataKey] = data;
}
