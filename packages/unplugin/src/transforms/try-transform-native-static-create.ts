import type { CssxPluginOptions } from '../core/options';
import type { IncomingSourceMap } from '../source-map/source-map-from-context';
import { createClassNameAllocator } from './class-name-allocator';
import { loadNativeAnalyzer } from './load-native-analyzer';
import { transformNativeStaticCreateModule } from './native-static-create';
import type { TransformExecutionOptions, TransformResult } from './transform-cssx-module';

/** Selects the production-only native path when its source-map constraints are met. */
export async function tryTransformNativeStaticCreateModule(
  code: string,
  id: string,
  sourceId: string,
  options: CssxPluginOptions & { readonly classNameAllocator?: import('@cssxio/compiler').ClassNameAllocator },
  inputSourceMap: IncomingSourceMap | undefined,
  transformOptions: TransformExecutionOptions,
  nativeOverride?: import('./native-static-sx').NativeCssxAnalyzer | null,
): Promise<TransformResult | null> {
  if (
    sourceId.includes('.vue.cssx-vue-') ||
    options.mode === 'development' ||
    (options.mode === undefined && transformOptions.compileCss === false) ||
    options.stableClassNames === true ||
    options.sourceMap !== false ||
    inputSourceMap !== undefined ||
    transformOptions.compileCss === false ||
    !code.includes(options.importSource ?? '@cssxio/cssx')
  ) {
    return null;
  }
  const native = nativeOverride === undefined ? loadNativeAnalyzer() : (nativeOverride ?? undefined);
  if (!native) {
    return null;
  }
  return transformNativeStaticCreateModule(
    code,
    sourceId,
    process.cwd(),
    options,
    options.classNameAllocator ?? createClassNameAllocator(options.className),
    native,
  );
}
