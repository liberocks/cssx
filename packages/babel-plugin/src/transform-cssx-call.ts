import type { NodePath } from '@babel/core';
import type * as babelTypes from '@babel/types';

import { assertModuleScope } from './assert-module-scope';
import { assertNoComputedCssxApiCall } from './assert-no-computed-cssx-api-call';
import type { FoldedPropsCall } from './finalize-folded-props';
import { isCreateCall } from './is-create-call';
import { isPropsCall } from './is-props-call';
import { isSxCall } from './is-sx-call';
import type { CssxPluginOptions, FileState } from './plugin-types';
import { transformCreateCall } from './transform-create-call';
import { transformStaticProps } from './transform-static-props';
import { transformSxCall } from './transform-sx-call';

/** Context required to dispatch one Babel call to a CSSX compiler transform. */
export interface TransformCssxCallOptions {
  /** Babel path for the call expression being visited. */
  readonly path: NodePath<import('@babel/types').CallExpression>;
  /** Babel node helpers. */
  readonly types: typeof babelTypes;
  /** Runtime module specifier imported by the source. */
  readonly importSource: string;
  /** Per-file compiler state. */
  readonly state: FileState;
  /** Plugin options for this source module. */
  readonly options: CssxPluginOptions;
  /** Canonical file identifier for stable generated class names. */
  readonly fileName: string;
  /** Folded props calls queued for final source replacement. */
  readonly foldedProps: FoldedPropsCall[];
}

/**
 * Validates a call and dispatches recognized CSSX APIs to their transforms.
 *
 * @param input Babel call context, compiler state, and module options.
 * @param input.path Babel path for the call expression being visited.
 * @param input.types Babel node helpers.
 * @param input.importSource Runtime module specifier imported by the source.
 * @param input.state Per-file compiler state.
 * @param input.options Plugin options for this source module.
 * @param input.fileName Canonical file identifier for stable generated class names.
 * @param input.foldedProps Folded props calls queued for final source replacement.
 * @returns Nothing. Recognized calls are compiled in place.
 */
export function transformCssxCall({
  path,
  types,
  importSource,
  state,
  options,
  fileName,
  foldedProps,
}: TransformCssxCallOptions): void {
  assertNoComputedCssxApiCall(path, types, importSource);
  if (isCreateCall(path, types, importSource)) {
    assertModuleScope(path);
    transformCreateCall({ path, types, state, options, fileName });
    return;
  }
  if (isPropsCall(path, types, importSource)) {
    transformStaticProps({ path, types, state, options, fileName, foldedProps });
  }
  if (isSxCall(path, types, importSource)) {
    const context = {
      theme: options.theme,
      reusabilityBudget: options.reusabilityBudget,
      stableClassNames: options.stableClassNames,
      fileName,
      state,
    };
    transformSxCall(path, types, context);
  }
}
