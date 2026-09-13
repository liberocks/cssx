import type { NodePath, PluginObj, PluginPass } from '@babel/core';
import * as babelTypes from '@babel/types';
import type { CallExpression } from '@babel/types';
import type { CssxPluginOptions, FileState } from './plugin-types';
import { markAllCandidates, markStyleKeyCandidates, recordCandidateOrigin } from './state-helpers';
import {
  assertModuleScope,
  assertNoComputedCssxApiCall,
  diagnosticError,
  isCreateCall,
  isSxCall,
  isPropsCall,
  memberPropertyName,
} from './ast-helpers';
import { compileStyleRecords, composeCompiledStyles, createClassNameAllocator } from '@cssxio/compiler';
import type { CompiledStyle } from '@cssxio/compiler';
import { cssOnlySignature } from './css-only-signature';
import { stableCompositeName } from './stable-composite-name';
import { styleMapExpression } from './style-map-expression';
import { withStableCompositeNames } from './with-stable-composite-names';
import { isGeneratedClassNames } from './is-generated-class-names';
import { readStaticSxSource } from './read-static-sx-source';
import { packedRecordKey } from './packed-record-key';
import { markEmittedClassNames } from './mark-emitted-class-names';
import { markStyleClass } from './mark-style-class';
import { markAllStyleClasses } from './mark-all-style-classes';
import { markFallbackClasses } from './mark-fallback-classes';
import { markAllFallbackClasses } from './mark-all-fallback-classes';
import { resolveStyleArgument } from './resolve-style-argument';
import { readStyleMap } from './read-style-map';
import { compileSxString } from './compile-sx-string';
import { transformSxArgument } from './transform-sx-argument';

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
  let foldedProps: Array<{ readonly path: NodePath<CallExpression>; readonly className: string }> = [];

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
          finalizeFoldedProps(path, t);
          path.scope.crawl();
          markReferencedStyleCandidates(path);
          materializeLiveStyleMaps(path, t);
          removeDeadStyleMaps(path);
          compactLiveStyleRecords(path);
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
          transformCreate(path, t);
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
   * Compiles a module-scope create call and records its styles for later props folding.
   *
   * @param path Create call to replace.
   * @param types Babel node helpers.
   * @returns Nothing. The call is replaced with compiled style data.
   */
  function transformCreate(path: NodePath<import('@babel/types').CallExpression>, types: typeof t): void {
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

  /** Materializes only style maps that could not be completely folded away. */
  function materializeLiveStyleMaps(program: NodePath<import('@babel/types').Program>, types: typeof t): void {
    for (const [styleName, styles] of state.styles) {
      const binding = program.scope.getBinding(styleName);
      if (!binding?.path.isVariableDeclarator() || binding.referencePaths.length === 0) {
        continue;
      }
      binding.path.node.init = styleMapExpression(styles, types);
    }
  }

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

  /** Emits compact static props after all folded calls in the module are known. */
  function finalizeFoldedProps(program: NodePath<import('@babel/types').Program>, types: typeof t): void {
    if (foldedProps.length === 0) {
      return;
    }
    const declarations: import('@babel/types').VariableDeclarator[] = [];
    const useHelper = foldedProps.length >= 4;
    const helper = useHelper ? program.scope.generateUidIdentifier('cssxProps') : undefined;
    if (helper) {
      declarations.push(
        types.variableDeclarator(
          helper,
          types.arrowFunctionExpression(
            [types.identifier('className')],
            types.objectExpression([
              types.objectProperty(types.identifier('className'), types.identifier('className')),
            ]),
          ),
        ),
      );
    }
    if (declarations.length > 0) {
      program.unshiftContainer('body', types.variableDeclaration('const', declarations));
    }
    for (const { path, className } of foldedProps) {
      path.replaceWith(
        helper
          ? types.callExpression(helper, [types.stringLiteral(className)])
          : types.objectExpression([
              types.objectProperty(types.identifier('className'), types.stringLiteral(className)),
            ]),
      );
    }
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
    const staticSource = readStaticSxSource(path.node.arguments, types);
    if (staticSource !== null) {
      if (isGeneratedClassNames(staticSource)) {
        return;
      }
      path.replaceWith(types.stringLiteral(compileSxString(staticSource, context, path.node.loc?.start)));
      return;
    }
    const transformed = path.node.arguments.map((argument) =>
      transformSxArgument(
        argument as import('@babel/types').Expression | import('@babel/types').SpreadElement,
        types,
        context,
      ),
    );
    if (transformed.some((argument) => argument === undefined)) {
      return;
    }
    const expressions = transformed.filter(
      (argument): argument is import('@babel/types').Expression => argument !== undefined,
    );
    path.node.arguments = expressions;
  }

  /**
   * Marks candidates used by references to styles produced by create calls.
   *
   * Static member access keeps one key. Dynamic access and non-member use keep every key.
   *
   * @param program Program whose bindings are inspected.
   * @returns Nothing.
   */
  function markReferencedStyleCandidates(program: NodePath<import('@babel/types').Program>): void {
    for (const [styleName, candidatesByKey] of state.styleCandidates) {
      const binding = program.scope.getBinding(styleName);
      for (const reference of binding!.referencePaths) {
        const parent = reference.parentPath;
        if (!parent?.isMemberExpression() || parent.node.object !== reference.node) {
          markAllCandidates(state, candidatesByKey);
          markAllStyleClasses(state, styleName);
          markAllFallbackClasses(state, styleName);
          continue;
        }
        const key = memberPropertyName(parent.node, t);
        if (key === null) {
          markAllCandidates(state, candidatesByKey);
          markAllStyleClasses(state, styleName);
          markAllFallbackClasses(state, styleName);
        } else {
          markStyleKeyCandidates(state, candidatesByKey, key);
          markStyleClass(state, styleName, key);
          markFallbackClasses(state, styleName, key);
        }
      }
    }
  }

  /** Removes generated style maps once every reference was statically folded. */
  function removeDeadStyleMaps(program: NodePath<import('@babel/types').Program>): void {
    for (const styleName of state.styles.keys()) {
      const binding = program.scope.getBinding(styleName);
      if (binding && binding.referencePaths.length === 0 && binding.path.isVariableDeclarator()) {
        binding.path.remove();
      }
    }
  }

  /** Interns repeated conflict tuples when a style map must remain available at runtime. */
  function compactLiveStyleRecords(program: NodePath<import('@babel/types').Program>): void {
    for (const styleName of state.styles.keys()) {
      const binding = program.scope.getBinding(styleName);
      if (!binding?.path.isVariableDeclarator() || !binding.path.parentPath?.isVariableDeclaration()) {
        continue;
      }
      const entries = new Map<string, { record: import('@babel/types').ArrayExpression; uses: number }>();
      const recordArrays: {
        readonly records: import('@babel/types').ArrayExpression;
        readonly index: number;
        readonly record: import('@babel/types').ArrayExpression;
      }[] = [];
      const styles = binding.path.node.init as import('@babel/types').ObjectExpression;
      for (const property of styles.properties) {
        const style = property as import('@babel/types').ObjectProperty;
        const records = (style.value as import('@babel/types').ObjectExpression).properties.find(
          (styleProperty) => t.isObjectProperty(styleProperty) && t.isIdentifier(styleProperty.key, { name: '_' }),
        ) as import('@babel/types').ObjectProperty;
        const recordValues = records.value as import('@babel/types').ArrayExpression;
        for (let index = 0; index < recordValues.elements.length; index++) {
          const record = recordValues.elements[index] as import('@babel/types').ArrayExpression;
          const key = packedRecordKey(record, t);
          const entry = entries.get(key) ?? { record, uses: 0 };
          entry.uses++;
          entries.set(key, entry);
          recordArrays.push({ records: recordValues, index, record });
        }
      }
      const interned = new Map<string, import('@babel/types').Identifier>();
      const declarations: import('@babel/types').VariableDeclarator[] = [];
      for (const [key, entry] of entries) {
        if (entry.uses < 2) {
          continue;
        }
        const identifier = program.scope.generateUidIdentifier('c');
        interned.set(key, identifier);
        declarations.push(t.variableDeclarator(identifier, entry.record));
      }
      if (declarations.length === 0) {
        continue;
      }
      for (const { records, index, record } of recordArrays) {
        const identifier = interned.get(packedRecordKey(record, t));
        if (!identifier) {
          continue;
        }
        records.elements[index] = t.identifier(identifier.name);
      }
      const declaration = binding.path.parentPath;
      const statement = declaration.parentPath?.isExportNamedDeclaration() ? declaration.parentPath : declaration;
      statement.insertBefore(t.variableDeclaration('const', declarations));
    }
  }
}
