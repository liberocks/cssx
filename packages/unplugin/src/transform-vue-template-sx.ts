import type { ClassNameAllocator, CssxRule } from '@cssxio/compiler';

import { findSxCalls } from './find-sx-calls';
import type { CssxPluginOptions } from './options';
import { quoteVueTemplateExpression } from './quote-vue-template-expression';
import { remapVueTemplateOrigins } from './remap-vue-template-origins';
import type { CssxCandidateOrigin } from './stylesheet';
import { templateAttributeQuote } from './template-attribute-quote';
import type { TransformResult } from './transform-cssx-module';
import { transformedExpression } from './transformed-expression';

/** Options forwarded to the JavaScript transformer for synthetic Vue template modules. */
type VueTemplateOptions = CssxPluginOptions & {
  readonly classNameAllocator?: ClassNameAllocator;
  readonly stableClassNames?: boolean;
  readonly stableClassNameFileName?: string;
};

/** Function that compiles one synthetic module containing a Vue template expression. */
type CssxModuleTransformer = (code: string, id: string, options: VueTemplateOptions) => Promise<TransformResult | null>;

/** Transforms static CSSX `sx()` calls embedded in a Vue template. */
export async function transformVueTemplateSx(
  code: string,
  sourceId: string,
  options: VueTemplateOptions,
  classNameAllocator: ClassNameAllocator,
  transformModule: CssxModuleTransformer,
): Promise<TransformResult | null> {
  const calls = findSxCalls(code);
  if (calls.length === 0) {
    return null;
  }
  const importSource = options.importSource ?? '@cssxio/cssx';
  const candidates: Record<string, string> = {};
  const composites: Record<string, readonly string[]> = {};
  const rules: CssxRule[] = [];
  const atomicClasses = new Set<string>();
  const origins: Record<string, CssxCandidateOrigin> = {};
  let transformedCode = code;

  for (const call of [...calls].reverse()) {
    const wrapperPrefix = `import { sx } from ${JSON.stringify(importSource)};\nconst style = `;
    const wrapperSource = `${wrapperPrefix}${call.code};`;
    const transformed = (await transformModule(wrapperSource, `${sourceId}.cssx-vue-template.ts`, {
      ...options,
      classNameAllocator,
    })) as TransformResult;
    const expression = quoteVueTemplateExpression(
      transformedExpression(transformed.code),
      templateAttributeQuote(code, call.start),
    );
    transformedCode = `${transformedCode.slice(0, call.start)}${expression}${transformedCode.slice(call.end)}`;
    Object.assign(candidates, transformed.candidates);
    Object.assign(composites, transformed.composites);
    Object.assign(
      origins,
      remapVueTemplateOrigins(code, call.start, wrapperSource, wrapperPrefix.length, transformed.origins),
    );
    rules.push(...transformed.rules);
    for (const className of transformed.atomicClasses) {
      atomicClasses.add(className);
    }
  }
  return {
    code: transformedCode,
    rules,
    candidates,
    composites,
    atomicClasses: [...atomicClasses],
    origins,
    cssOnlySignature: transformedCode,
  };
}
