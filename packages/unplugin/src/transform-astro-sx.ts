import { createClassNameAllocator } from '@cssxio/compiler';
import type { ClassNameAllocator, CssxRule } from '@cssxio/compiler';
import type { CssxPluginOptions } from './options';
import { findSxCalls } from './find-sx-calls';
import type { TransformResult } from './transform-cssx-module';
import { transformedExpression } from './transformed-expression';

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
): Promise<TransformResult | null> {
  const calls = findSxCalls(code);
  if (calls.length === 0) {
    return null;
  }

  const classNameAllocator = options.classNameAllocator ?? createClassNameAllocator();
  const importSource = options.importSource ?? '@cssxio/cssx';
  const candidates: Record<string, string> = {};
  const composites: Record<string, readonly string[]> = {};
  const rules: CssxRule[] = [];
  let transformedCode = code;

  for (const call of [...calls].reverse()) {
    const transformed = (await transformModule(
      `import { sx } from ${JSON.stringify(importSource)};\nconst style = ${call.code};`,
      `${id}.ts`,
      { ...options, classNameAllocator },
    )) as TransformResult;
    const expression = transformedExpression(transformed.code);
    transformedCode = `${transformedCode.slice(0, call.start)}${expression}${transformedCode.slice(call.end)}`;
    Object.assign(candidates, transformed.candidates);
    Object.assign(composites, transformed.composites);
    rules.push(...transformed.rules);
  }

  return {
    code: transformedCode,
    rules,
    candidates,
    composites,
    atomicClasses: [],
    origins: {},
    cssOnlySignature: transformedCode,
  };
}
