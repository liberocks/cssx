import { createClassNameAllocator } from '@cssxio/compiler';
import type { ClassNameAllocator } from '@cssxio/compiler';
import { parse as parseVueSfc } from '@vue/compiler-sfc';

import { mergeTransformResults } from './merge-transform-results';
import type { CssxPluginOptions } from './options';
import { remapVueBlockOrigins } from './remap-vue-block-origins';
import type { TransformResult } from './transform-cssx-module';
import { transformVueTemplateSx } from './transform-vue-template-sx';

/** Options forwarded to script and template transforms for a Vue SFC. */
type VueSfcOptions = CssxPluginOptions & {
  readonly classNameAllocator?: ClassNameAllocator;
  readonly stableClassNames?: boolean;
  readonly stableClassNameFileName?: string;
};

/** Function that compiles one synthetic or extracted source module. */
type CssxModuleTransformer = (code: string, id: string, options: VueSfcOptions) => Promise<TransformResult | null>;

/**
 * Transforms CSSX calls inside Vue Single-File Component script and template blocks.
 *
 * Vue templates expose imports from `script setup` to template expressions, so
 * `:class="sx(...)"` uses the same CSSX API as JSX while retaining native SFC
 * syntax for the Vue plugin that runs later in Vite's transform pipeline.
 *
 * @param code Vue Single-File Component source.
 * @param id Vue component identifier.
 * @param options Adapter options.
 * @param transformModule CSSX source-module transformer.
 * @returns Transformed SFC and collected CSS metadata, or null when unused.
 */
export async function transformVueSfcModule(
  code: string,
  id: string,
  options: VueSfcOptions,
  transformModule: CssxModuleTransformer,
): Promise<TransformResult | null> {
  const sourceId = id.split('?', 1).join('');
  const parsed = parseVueSfc(code, { filename: sourceId });
  if (parsed.errors.length > 0) {
    throw new Error(parsed.errors[0]!.message);
  }

  const classNameAllocator = options.classNameAllocator ?? createClassNameAllocator();
  const replacements: Array<{ readonly start: number; readonly end: number; readonly code: string }> = [];
  const results: TransformResult[] = [];

  for (const block of [parsed.descriptor.script, parsed.descriptor.scriptSetup]) {
    if (!block?.content.includes(options.importSource ?? '@cssxio/cssx')) {
      continue;
    }
    const extension = block.lang === 'js' || block.lang === 'jsx' || block.lang === 'tsx' ? block.lang : 'ts';
    const transformed = (await transformModule(block.content, `${sourceId}.cssx-vue-script.${extension}`, {
      ...options,
      classNameAllocator,
    }))!;
    replacements.push({ start: block.loc.start.offset, end: block.loc.end.offset, code: transformed.code });
    results.push({
      ...transformed,
      origins: remapVueBlockOrigins(code, block.loc.start.offset, transformed.origins),
    });
  }

  const template = parsed.descriptor.template;
  if (template?.content.includes('sx')) {
    const transformed = await transformVueTemplateSx(
      template.content,
      sourceId,
      options,
      classNameAllocator,
      transformModule,
    );
    if (transformed) {
      replacements.push({ start: template.loc.start.offset, end: template.loc.end.offset, code: transformed.code });
      results.push({
        ...transformed,
        origins: remapVueBlockOrigins(code, template.loc.start.offset, transformed.origins),
      });
    }
  }

  if (replacements.length === 0) {
    return null;
  }
  let transformedCode = code;
  for (const replacement of replacements.sort((left, right) => right.start - left.start)) {
    transformedCode = `${transformedCode.slice(0, replacement.start)}${replacement.code}${transformedCode.slice(replacement.end)}`;
  }
  return mergeTransformResults(transformedCode, results);
}
