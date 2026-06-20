import type { NodePath, PluginObj, PluginPass } from '@babel/core';
import * as babelTypes from '@babel/types';
import type { ObjectExpression } from '@babel/types';
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
  objectPropertyName,
  packedStyleExpression,
  propertyKey,
  readStaticString,
} from './ast-helpers';
import { compileStyleRecords, composeCompiledStyles, createClassNameAllocator } from '@cssxio/compiler';
import type { CompiledStyle, CompiledStyleRecordMap } from '@cssxio/compiler';

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

  return {
    name: '@cssxio/babel-plugin',
    visitor: {
      Program: {
        enter(_path, babelState) {
          fileName = babelState.file.opts.filename ?? '';
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
        },
        exit(path, babelState) {
          path.scope.crawl();
          markReferencedStyleCandidates(path);
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
    const input = readStyleMap(path.get('arguments.0') as NodePath<ObjectExpression>, types);
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
          : `create:${path.node.loc?.start.line ?? 0}:${path.node.loc?.start.column ?? 0}`;
      result = withStableCompositeNames(result, fileName, anchor);
    }
    for (const [candidate, className] of Object.entries(result.classes)) {
      state.classes.set(candidate, className);
      recordCandidateOrigin(state, candidate, path.node.loc?.start);
    }
    for (const [className, atomicClasses] of Object.entries(result.composites)) {
      state.composites.set(className, atomicClasses);
    }

    const replacement = types.objectExpression(
      Object.entries(result.styles).map(([key, style]) =>
        types.objectProperty(propertyKey(key, types), packedStyleExpression(style, types)),
      ),
    );

    if (parent.isVariableDeclarator() && types.isIdentifier(parent.node.id)) {
      state.styles.set(parent.node.id.name, result.styles);
      state.styleCandidates.set(parent.node.id.name, result.candidates);
      state.styleClasses.set(parent.node.id.name, result.classNames);
    }
    path.replaceWith(replacement);
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
      const resolved = resolveStyleArgument(argument, types);
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
        : (composition?.className ?? '');
    if (composition) {
      state.composites.set(className, composition.atomicClasses);
    }
    markEmittedClassNames(className);
    path.replaceWith(
      types.objectExpression([types.objectProperty(types.identifier('className'), types.stringLiteral(className))]),
    );
  }

  /**
   * Compiles static strings inside an sx call and preserves unsupported arguments.
   *
   * @param path Sx call to transform.
   * @param types Babel node helpers.
   * @returns Nothing. Unsupported nested input leaves the whole call unchanged.
   */
  function transformSx(path: NodePath<import('@babel/types').CallExpression>, types: typeof t): void {
    const staticSource = readStaticSxSource(path.node.arguments, types);
    if (staticSource !== null) {
      path.replaceWith(types.stringLiteral(compileSxString(staticSource, path.node.loc?.start)));
      return;
    }
    const transformed = path.node.arguments.map((argument) => transformSxArgument(argument, types));
    if (transformed.some((argument) => argument === undefined)) {
      return;
    }
    const expressions = transformed.filter(
      (argument): argument is import('@babel/types').Expression => argument !== undefined,
    );
    if (expressions.every((expression) => types.isStringLiteral(expression))) {
      path.replaceWith(
        types.stringLiteral(
          expressions
            .map((expression) => expression.value)
            .filter(Boolean)
            .join(' '),
        ),
      );
      return;
    }
    path.node.arguments = expressions;
  }

  /**
   * Transforms one sx argument when all of its nested static forms are supported.
   *
   * It accepts strings, false, null, arrays without spreads, logical-and expressions, and conditionals.
   * Other expressions are kept unchanged. Spreads, JSX namespace names, placeholders, and unsupported
   * nested forms return undefined as a sentinel that stops folding the enclosing sx call.
   *
   * @param node Sx argument or nested array element to transform.
   * @param types Babel node helpers.
   * @returns A transformed expression, or undefined when this input prevents static transformation.
   */
  function transformSxArgument(
    node:
      | import('@babel/types').Expression
      | import('@babel/types').JSXNamespacedName
      | import('@babel/types').SpreadElement
      | import('@babel/types').ArgumentPlaceholder,
    types: typeof t,
  ): import('@babel/types').Expression | undefined {
    if (types.isSpreadElement(node) || types.isJSXNamespacedName(node) || types.isArgumentPlaceholder(node)) {
      return undefined;
    }
    if (types.isStringLiteral(node)) {
      return types.stringLiteral(compileSxString(node.value, node.loc?.start));
    }
    if (types.isNullLiteral(node) || types.isBooleanLiteral(node, { value: false })) {
      return types.stringLiteral('');
    }
    if (types.isArrayExpression(node)) {
      const elements = node.elements.map((element) =>
        element && !types.isSpreadElement(element) ? transformSxArgument(element, types) : undefined,
      );
      if (elements.some((element) => element === undefined)) {
        return undefined;
      }
      const values = elements.filter((element): element is import('@babel/types').Expression => element !== undefined);
      if (values.every((element) => types.isStringLiteral(element))) {
        return types.stringLiteral(
          values
            .map((element) => element.value)
            .filter(Boolean)
            .join(' '),
        );
      }
      return types.arrayExpression(values);
    }
    if (types.isLogicalExpression(node, { operator: '&&' })) {
      const right = transformSxArgument(node.right, types);
      return right ? types.logicalExpression('&&', node.left, right) : undefined;
    }
    if (types.isConditionalExpression(node)) {
      const consequent = transformSxArgument(node.consequent, types);
      const alternate = transformSxArgument(node.alternate, types);
      return consequent && alternate ? types.conditionalExpression(node.test, consequent, alternate) : undefined;
    }
    return node;
  }

  /**
   * Compiles one static sx utility string and records all of its candidates as reachable.
   *
   * @param source Static utility string to compile.
   * @param location Start location of the source string.
   * @param location.line One-based source line.
   * @param location.column Zero-based source column.
   * @returns The compiled class names separated by spaces.
   */
  function compileSxString(source: string, location?: { readonly line: number; readonly column: number }): string {
    if (!source.trim()) {
      return '';
    }
    let result;
    try {
      result = compileStyleRecords(
        { inline: source },
        {
          theme: options.theme,
          classNameAllocator: state.classNameAllocator,
          reusabilityBudget: options.reusabilityBudget,
        },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to compile CSSX sx() utilities.';
      throw new Error(message);
    }
    const className = options.stableClassNames
      ? stableCompositeName(fileName, location, 'sx')
      : (result.classNames.inline ?? '');
    for (const [candidate, candidateClassName] of Object.entries(result.classes)) {
      state.classes.set(candidate, candidateClassName);
      state.liveCandidates.add(candidate);
      recordCandidateOrigin(state, candidate, location);
    }
    for (const [compositeClassName, atomicClasses] of Object.entries(result.composites)) {
      state.composites.set(compositeClassName, atomicClasses);
    }
    if (className) {
      if (options.stableClassNames) {
        state.composites.set(className, atomicClassesForStyle(result.styles.inline));
      }
      markEmittedClassNames(className);
    }
    return className;
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
      if (!binding) {
        continue;
      }
      for (const reference of binding.referencePaths) {
        const parent = reference.parentPath;
        if (!parent?.isMemberExpression() || parent.node.object !== reference.node) {
          markAllCandidates(state, candidatesByKey);
          markAllStyleClasses(styleName);
          markAllFallbackClasses(styleName);
          continue;
        }
        const key = memberPropertyName(parent.node, t);
        if (key === null) {
          markAllCandidates(state, candidatesByKey);
          markAllStyleClasses(styleName);
          markAllFallbackClasses(styleName);
        } else {
          markStyleKeyCandidates(state, candidatesByKey, key);
          markStyleClass(styleName, key);
          markFallbackClasses(styleName, key);
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
      const styles = binding.path.node.init;
      if (!styles || !t.isObjectExpression(styles)) {
        continue;
