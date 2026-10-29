import { createClassNameAllocator } from '@cssxio/compiler';
import type { ClassNameAllocator } from '@cssxio/compiler';

import type { CssxPluginOptions } from '../core/options';
import type { IncomingSourceMap } from '../source-map/source-map-from-context';
import { scanNativeStaticSxModule } from './native-static-sx';
import type { TransformExecutionOptions, TransformResult } from './transform-cssx-module';

/** CSSX options with the stable file and shared allocator used by adapter transforms. */
type NativeTransformOptions = CssxPluginOptions & {
  readonly classNameAllocator?: ClassNameAllocator;
  readonly stableClassNameFileName?: string;
};

/** Uses the Oxc static-sx path only when development output needs no Babel source map. */
export async function tryTransformNativeStaticSxModule(
  code: string,
  id: string,
  sourceId: string,
  options: NativeTransformOptions,
  inputSourceMap: IncomingSourceMap | undefined,
  transformOptions: TransformExecutionOptions,
): Promise<TransformResult | null> {
  if (
    options.mode !== 'development' ||
    options.stableClassNames !== true ||
    options.stableClassNameStrategy !== 'module-order' ||
    options.sourceMap !== false ||
    inputSourceMap !== undefined ||
    transformOptions.compileCss !== false
  ) {
    return null;
  }
  const nativeScan = await scanNativeStaticSxModule(
    code,
    sourceId,
    process.cwd(),
    options,
    options.classNameAllocator ?? createClassNameAllocator(options.className),
    options.stableClassNameFileName ?? sourceId,
  );
  if (!nativeScan.handled || !nativeScan.module || nativeScan.transformedCode === undefined) {
    return null;
  }
  const metadata = nativeScan.module;
  return {
    code: nativeScan.transformedCode,
    rules: [],
    candidates: metadata.candidates ?? {},
    composites: metadata.composites ?? {},
    atomicClasses: metadata.atomicClasses ?? [],
    origins: metadata.origins ?? {},
    cssOnlySignature: nativeScan.cssOnlySignature ?? '',
  };
}
