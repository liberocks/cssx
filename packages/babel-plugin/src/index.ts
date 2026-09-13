import type { NodePath, PluginObj, PluginPass } from '@babel/core';
import type * as babelTypes from '@babel/types';
import { composeCompiledStyles, createClassNameAllocator } from '@cssxio/compiler';
import type { CompiledStyle } from '@cssxio/compiler';

import { assertModuleScope } from './assert-module-scope';
import { assertNoComputedCssxApiCall } from './assert-no-computed-cssx-api-call';
import { compactLiveStyleRecords } from './compact-live-style-records';
import { cssOnlySignature } from './css-only-signature';
import { finalizeFoldedProps } from './finalize-folded-props';
import type { FoldedPropsCall } from './finalize-folded-props';
import { isCreateCall } from './is-create-call';
import { isPropsCall } from './is-props-call';
import { isSxCall } from './is-sx-call';
import { markEmittedClassNames } from './mark-emitted-class-names';
import { markReferencedStyleCandidates } from './mark-referenced-style-candidates';
import { materializeLiveStyleMaps } from './materialize-live-style-maps';
import type { CssxPluginOptions, FileState } from './plugin-types';
import { removeDeadStyleMaps } from './remove-dead-style-maps';
import { resolveStyleArgument } from './resolve-style-argument';
import { stableCompositeName } from './stable-composite-name';
import { transformCreateCall } from './transform-create-call';
import { transformSxCall } from './transform-sx-call';

/** Default module specifier used when the plugin options do not override it. */
const DEFAULT_IMPORT_SOURCE = '@cssxio/cssx';

export type { CssxPluginOptions } from './plugin-types';

/**
 * Compiles CSSX calls in one source module.
 *
 * Program entry creates fresh file state. Call visits compile create, props, and sx calls.
 * Program exit finds reachable candidates, removes unused CSSX imports, and writes metadata.
 * Metadata has a cssx property with candidates mapped to class names and first source origins.
 * Only reachable candidates are included. Origin lines are zero-based and columns are zero-based.
 *
 * @param api The compiler API.
 * @param api.types Helpers for creating source code nodes.
 * @param api.assertVersion Checks the supported compiler version.
 * @param options Plugin options.
 * @returns A compiler plugin that transforms CSSX calls.
 */
export default function cssxBabelPlugin(
  api: { readonly types: typeof babelTypes; assertVersion(version: number): void },
  options: CssxPluginOptions = {},
): PluginObj<PluginPass> {
  api.assertVersion(7);
  const t = api.types;
  const importSource = options.importSource ?? DEFAULT_IMPORT_SOURCE;
  let state: FileState;
  let fileName = '';
  let foldedProps: FoldedPropsCall[] = [];

  return {
    name: '@cssxio/babel-plugin',
    visitor: {
      Program: {
        enter(_path, babelState) {
          fileName = options.stableClassNameFileName ?? babelState.file.opts.filename ?? '';
          state = {
            classNameAllocator: options.classNameAllocator ?? createClassNameAllocator(options.className),
            styles: new Map(),
            styleCandidates: new Map(),
            styleClasses: new Map(),
            classes: new Map(),
            candidateOrigins: new Map(),
            liveCandidates: new Set(),
            composites: new Map(),
            liveComposites: new Set(),
            liveFallbackClasses: new Set(),
            cssRanges: [],
          };
          foldedProps = [];
        },
        exit(path, babelState) {
          finalizeFoldedProps(path, t, foldedProps);
          path.scope.crawl();
          markReferencedStyleCandidates(path, t, state);
          materializeLiveStyleMaps(path, t, state);
          removeDeadStyleMaps(path, state);
          compactLiveStyleRecords(path, t, state);
          for (const statement of path.get('body')) {
            if (!statement.isImportDeclaration() || statement.node.source.value !== importSource) {
              continue;
            }
            for (const specifier of [...statement.get('specifiers')]) {
              const local = specifier.node.local.name;
              const binding = path.scope.getBinding(local);
              if (binding?.referencePaths.length === 0) {
                specifier.remove();
              }
            }
            if (statement.node.specifiers.length === 0) {
              statement.remove();
            }
          }
          (babelState.file.metadata as Record<string, unknown>).cssx = {
            candidates: Object.fromEntries(
              [...state.classes].filter(([candidate]) => state.liveCandidates.has(candidate)),
            ),
            origins: Object.fromEntries(
              [...state.candidateOrigins].filter(([candidate]) => state.liveCandidates.has(candidate)),
            ),
            composites: Object.fromEntries(
              [...state.composites].filter(([className]) => state.liveComposites.has(className)),
            ),
            atomicClasses: [...state.liveFallbackClasses].sort(),
            cssOnlySignature: cssOnlySignature(babelState.file.code, state.cssRanges),
          };
        },
      },
      CallExpression(path) {
        assertNoComputedCssxApiCall(path, t, importSource);
        if (isCreateCall(path, t, importSource)) {
          assertModuleScope(path);
          transformCreateCall({ path, types: t, state, options, fileName });
          return;
        }
        if (isPropsCall(path, t, importSource)) {
          transformStaticProps(path, t);
        }
        if (isSxCall(path, t, importSource)) {
          transformSx(path, t);
        }
      },
    },
  };

  /**
   * Folds a props call when every argument is a known static compiled style form.
   *
   * @param path Props call to consider.
   * @param types Babel node helpers.
   * @returns Nothing. Unsupported arguments leave the original runtime call unchanged.
   */
  function transformStaticProps(path: NodePath<import('@babel/types').CallExpression>, types: typeof t): void {
    const styles: CompiledStyle[] = [];
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

  /**
   * Compiles static strings inside an sx call and preserves unsupported arguments.
   *
   * @param path Sx call to transform.
   * @param types Babel node helpers.
   * @returns Nothing. Unsupported nested input leaves the whole call unchanged.
   */
  function transformSx(path: NodePath<import('@babel/types').CallExpression>, types: typeof t): void {
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
