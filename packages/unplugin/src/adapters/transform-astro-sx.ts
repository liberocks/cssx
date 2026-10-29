import { createClassNameAllocator } from '@cssxio/compiler';
import type { ClassNameAllocator } from '@cssxio/compiler';

import type { CssxPluginOptions } from '../core/options';
import type { IncomingSourceMap } from '../source-map/source-map-from-context';
import { findSxCalls } from '../transforms/find-sx-calls';
import { mergeTransformResults } from '../transforms/merge-transform-results';
import type { TransformExecutionOptions, TransformResult } from '../transforms/transform-cssx-module';
import { transformedExpression } from '../transforms/transformed-expression';

/** Options forwarded to synthetic Astro expression modules. */
type AstroTransformOptions = CssxPluginOptions & {
  readonly classNameAllocator?: ClassNameAllocator;
  readonly stableClassNames?: boolean;
  readonly stableClassNameFileName?: string;
};

/** Function that compiles one synthetic Astro expression module. */
type CssxModuleTransformer = (
  code: string,
  id: string,
  options: AstroTransformOptions,
  inputSourceMap?: IncomingSourceMap,
  transformOptions?: TransformExecutionOptions,
) => Promise<TransformResult | null>;

/**
 * Transforms `sx` expressions embedded in an Astro template without parsing its HTML as JavaScript.
 *
 * @param code Astro component source.
 * @param id Astro component identifier.
 * @param options Adapter options.
 * @param transformModule CSSX source-module transformer.
 * @returns Transformed Astro source and its compiled CSS metadata.
 */
export async function transformAstroSxModule(
  code: string,
  id: string,
  options: AstroTransformOptions,
  transformModule: CssxModuleTransformer,
  transformOptions: TransformExecutionOptions = {},
): Promise<TransformResult | null> {
  const calls = findSxCalls(code);
  if (calls.length === 0) {
    return null;
  }

  const classNameAllocator = options.classNameAllocator ?? createClassNameAllocator();
  const importSource = options.importSource ?? '@cssxio/cssx';
  const results: TransformResult[] = [];
  let transformedCode = code;

  for (const call of [...calls].reverse()) {
    const transformed = (await transformModule(
      `import { sx } from ${JSON.stringify(importSource)};\nconst style = ${call.code};`,
      `${id}.ts`,
      { ...options, classNameAllocator },
      undefined,
      transformOptions,
    )) as TransformResult;
    const expression = transformedExpression(transformed.code);
    transformedCode = `${transformedCode.slice(0, call.start)}${expression}${transformedCode.slice(call.end)}`;
    results.push({ ...transformed, atomicClasses: [], origins: {} });
  }

  return mergeTransformResults(transformedCode, results);
}
