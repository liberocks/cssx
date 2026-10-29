import type { ClassNameAllocator } from '@cssxio/compiler';

import type { CssxPluginOptions } from '../core/options';
import { remapVueTemplateOrigins } from '../source-map/remap-vue-template-origins';
import type { IncomingSourceMap } from '../source-map/source-map-from-context';
import { findSxCalls } from '../transforms/find-sx-calls';
import { mergeTransformResults } from '../transforms/merge-transform-results';
import { quoteVueTemplateExpression } from '../transforms/quote-vue-template-expression';
import { templateAttributeQuote } from '../transforms/template-attribute-quote';
import type { TransformExecutionOptions, TransformResult } from '../transforms/transform-cssx-module';
import { transformedExpression } from '../transforms/transformed-expression';

/** Options forwarded to the JavaScript transformer for synthetic Vue template modules. */
type VueTemplateOptions = CssxPluginOptions & {
  readonly classNameAllocator?: ClassNameAllocator;
  readonly stableClassNames?: boolean;
  readonly stableClassNameFileName?: string;
};

/** Function that compiles one synthetic module containing a Vue template expression. */
type CssxModuleTransformer = (
  code: string,
  id: string,
  options: VueTemplateOptions,
  inputSourceMap?: IncomingSourceMap,
  transformOptions?: TransformExecutionOptions,
) => Promise<TransformResult | null>;

/** Transforms static CSSX `sx()` calls embedded in a Vue template. */
export async function transformVueTemplateSx(
  code: string,
  sourceId: string,
  options: VueTemplateOptions,
  classNameAllocator: ClassNameAllocator,
  transformModule: CssxModuleTransformer,
  transformOptions: TransformExecutionOptions = {},
): Promise<TransformResult | null> {
  const calls = findSxCalls(code);
  if (calls.length === 0) {
    return null;
  }
  const importSource = options.importSource ?? '@cssxio/cssx';
  const results: TransformResult[] = [];
  let transformedCode = code;

  for (const call of [...calls].reverse()) {
    const wrapperPrefix = `import { sx } from ${JSON.stringify(importSource)};\nconst style = `;
    const wrapperSource = `${wrapperPrefix}${call.code};`;
    const transformed = (await transformModule(
      wrapperSource,
      `${sourceId}.cssx-vue-template.ts`,
      {
        ...options,
        classNameAllocator,
      },
      undefined,
      transformOptions,
    )) as TransformResult;
    const expression = quoteVueTemplateExpression(
      transformedExpression(transformed.code),
      templateAttributeQuote(code, call.start),
    );
    transformedCode = `${transformedCode.slice(0, call.start)}${expression}${transformedCode.slice(call.end)}`;
    results.push({
      ...transformed,
      origins: remapVueTemplateOrigins(code, call.start, wrapperSource, wrapperPrefix.length, transformed.origins),
    });
  }
  return mergeTransformResults(transformedCode, results);
}
