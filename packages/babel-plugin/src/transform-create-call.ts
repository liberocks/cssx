import type { NodePath } from '@babel/core';
import type * as babelTypes from '@babel/types';
import { compileStyleRecords } from '@cssxio/compiler';

import { diagnosticError } from './diagnostic-error';
import type { CssxPluginOptions, FileState } from './plugin-types';
import { readStyleMap } from './read-style-map';
import { recordCandidateOrigin } from './state-helpers';
import { styleMapExpression } from './style-map-expression';
import { withStableCompositeNames } from './with-stable-composite-names';

/** Context required to compile and replace one CSSX create call. */
export interface TransformCreateCallOptions {
  /** Babel path for the recognized create call. */
  readonly path: NodePath<import('@babel/types').CallExpression>;
  /** Babel node builders. */
  readonly types: typeof babelTypes;
  /** Plugin options for this source module. */
  readonly options: CssxPluginOptions;
  /** Per-file compiler state. */
  readonly state: FileState;
  /** File identifier used to derive stable composite names. */
  readonly fileName: string;
}

/**
 * Compiles a module-scope create call and records its styles for later props folding.
 *
 * @param options Babel path, compiler state, and options for the create call.
 * @param options.path Babel path for the recognized create call.
 * @param options.types Babel node builders.
 * @param options.state Per-file compiler state.
 * @param options.options Plugin options for this source module.
 * @param options.fileName File identifier used to derive stable composite names.
 * @returns Nothing. Replaces the call with compiled style data.
 */
export function transformCreateCall({ path, types, state, options, fileName }: TransformCreateCallOptions): void {
  if (path.node.arguments.length !== 1 || !types.isObjectExpression(path.node.arguments[0])) {
    throw diagnosticError(path, 'cssx.create() expects one object literal argument.');
  }
  const input = readStyleMap(
    path.get('arguments.0') as NodePath<import('@babel/types').ObjectExpression>,
    types,
    state,
  );
  let result;
  try {
    result = compileStyleRecords(input, {
      theme: options.theme,
      classNameAllocator: state.classNameAllocator,
      reusabilityBudget: options.reusabilityBudget,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to compile CSSX styles.';
    throw diagnosticError(path, message);
  }
  const parent = path.parentPath;
  if (options.stableClassNames) {
    const anchor =
      parent.isVariableDeclarator() && types.isIdentifier(parent.node.id)
        ? `map:${parent.node.id.name}`
        : `create:${path.node.loc!.start.line}:${path.node.loc!.start.column}`;
    result = withStableCompositeNames(result, fileName, anchor);
  }
  for (const [candidate, className] of Object.entries(result.classes)) {
    state.classes.set(candidate, className);
    recordCandidateOrigin(state, candidate, path.node.loc?.start);
  }
  for (const [className, atomicClasses] of Object.entries(result.composites)) {
    state.composites.set(className, atomicClasses);
  }

  if (parent.isVariableDeclarator() && types.isIdentifier(parent.node.id)) {
    const styleName = parent.node.id.name;
    state.styles.set(styleName, result.styles);
    state.styleCandidates.set(styleName, result.candidates);
    state.styleClasses.set(styleName, result.classNames);
    path.replaceWith(types.objectExpression([]));
    return;
  }
  path.replaceWith(styleMapExpression(result.styles, types));
}
