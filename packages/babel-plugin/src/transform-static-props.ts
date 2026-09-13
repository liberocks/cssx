import type { NodePath } from '@babel/core';
import type * as babelTypes from '@babel/types';
import { composeCompiledStyles } from '@cssxio/compiler';

import type { FoldedPropsCall } from './finalize-folded-props';
import { markEmittedClassNames } from './mark-emitted-class-names';
import type { CssxPluginOptions, FileState } from './plugin-types';
import { resolveStyleArgument } from './resolve-style-argument';
import { stableCompositeName } from './stable-composite-name';

/** Context required to fold one statically resolvable CSSX props call. */
export interface TransformStaticPropsOptions {
  /** Babel path for the recognized props call. */
  readonly path: NodePath<import('@babel/types').CallExpression>;
  /** Babel node helpers. */
  readonly types: typeof babelTypes;
  /** Per-file compiler state. */
  readonly state: FileState;
  /** Plugin options for this source module. */
  readonly options: CssxPluginOptions;
  /** File identifier used to derive stable composite names. */
  readonly fileName: string;
  /** Folded calls queued for final source replacement. */
  readonly foldedProps: FoldedPropsCall[];
}

/**
 * Folds a props call when every argument is a known static compiled style form.
 *
 * @param options Call path, compiler state, and source metadata for this props call.
 * @param options.path Babel path for the recognized props call.
 * @param options.types Babel node helpers.
 * @param options.state Per-file compiler state.
 * @param options.options Plugin options for this source module.
 * @param options.fileName File identifier used to derive stable composite names.
 * @param options.foldedProps Folded calls queued for final source replacement.
 * @returns Nothing. Unsupported arguments leave the original runtime call unchanged.
 */
export function transformStaticProps({
  path,
  types,
  state,
  options,
  fileName,
  foldedProps,
}: TransformStaticPropsOptions): void {
  const styles = [];
  for (const argument of path.node.arguments) {
    if (types.isSpreadElement(argument)) {
      return;
    }
    const resolved = resolveStyleArgument(argument, types, state);
    if (resolved === undefined) {
      return;
    }
    if (resolved) {
      styles.push(...resolved);
    }
  }
  const singleStyle = styles.length === 1 ? styles[0] : undefined;
  const composition = singleStyle ? undefined : composeCompiledStyles(styles, state.classNameAllocator);
  const className = singleStyle
    ? singleStyle.c
    : options.stableClassNames
      ? stableCompositeName(
          fileName,
          undefined,
          `props:${styles
            .map((style) => style.c)
            .sort()
            .join('\u0000')}`,
        )
      : composition!.className;
  if (composition) {
    state.composites.set(className, composition.atomicClasses);
  }
  markEmittedClassNames(className, state);
  foldedProps.push({ path, className });
}
