import type { NodePath, PluginObj, PluginPass } from '@babel/core';
import * as babelTypes from '@babel/types';
import type { CallExpression, ObjectExpression } from '@babel/types';
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
        : composition!.className;
    if (composition) {
      state.composites.set(className, composition.atomicClasses);
    }
    markEmittedClassNames(className);
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
    const staticSource = readStaticSxSource(path.node.arguments, types);
    if (staticSource !== null) {
      if (isGeneratedClassNames(staticSource)) {
        return;
      }
      path.replaceWith(types.stringLiteral(compileSxString(staticSource, path.node.loc?.start)));
      return;
    }
    const transformed = path.node.arguments.map((argument) =>
      transformSxArgument(argument as import('@babel/types').Expression | import('@babel/types').SpreadElement, types),
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
    node: import('@babel/types').Expression | import('@babel/types').SpreadElement,
    types: typeof t,
  ): import('@babel/types').Expression | undefined {
    if (types.isSpreadElement(node)) {
      return undefined;
    }
    if (types.isStringLiteral(node)) {
      if (isGeneratedClassNames(node.value)) {
        return node;
      }
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
      : result.classNames.inline!;
    for (const [candidate, candidateClassName] of Object.entries(result.classes)) {
      state.classes.set(candidate, candidateClassName);
      state.liveCandidates.add(candidate);
      recordCandidateOrigin(state, candidate, location);
    }
    for (const [compositeClassName, atomicClasses] of Object.entries(result.composites)) {
      state.composites.set(compositeClassName, atomicClasses);
    }
    if (options.stableClassNames) {
      state.composites.set(className, atomicClassesForStyle(result.styles.inline!));
    }
    markEmittedClassNames(className);
    return className!;
  }

  /** Recognizes the default serial class names written by an earlier CSSX transform. */
  function isGeneratedClassNames(value: string): boolean {
    return /^s[0-9A-Za-z]+x(?:\s+s[0-9A-Za-z]+x)*$/.test(value);
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
      const styles = binding.path.node.init as import('@babel/types').ObjectExpression;
      for (const property of styles.properties) {
        const style = property as import('@babel/types').ObjectProperty;
        const records = (style.value as import('@babel/types').ObjectExpression).properties.find(
          (styleProperty) => t.isObjectProperty(styleProperty) && t.isIdentifier(styleProperty.key, { name: '_' }),
        ) as import('@babel/types').ObjectProperty;
        const recordValues = records.value as import('@babel/types').ArrayExpression;
        for (let index = 0; index < recordValues.elements.length; index++) {
          const record = recordValues.elements[index] as import('@babel/types').ArrayExpression;
          const key = packedRecordKey(record);
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
        const identifier = interned.get(packedRecordKey(record));
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

  /** Returns a stable key for the compact runtime tuple representation. */
  function packedRecordKey(record: import('@babel/types').ArrayExpression): string {
    return JSON.stringify(
      record.elements.map((value) =>
        t.isNullLiteral(value) ? null : (value as import('@babel/types').StringLiteral).value,
      ),
    );
  }

  /**
   * Reads the static utility map accepted by a create call.
   *
   * It accepts plain non-computed properties with static string values. Unsupported properties cause
   * a source diagnostic.
   *
   * @param path Object argument from a create call.
   * @param types Babel node helpers.
   * @returns The style names and their static utility strings.
   */
  function readStyleMap(path: NodePath<ObjectExpression>, types: typeof t): Record<string, string> {
    const result: Record<string, string> = Object.create(null) as Record<string, string>;
    for (const property of path.get('properties')) {
      if (!property.isObjectProperty() || property.node.computed) {
        throw diagnosticError(property, 'cssx.create() only supports plain object properties.');
      }
      const key = objectPropertyName(property.node, types);
      const value = property.get('value');
      const utilityString = readStaticString(value);
      if (!key || utilityString === null) {
        throw diagnosticError(property, 'Each cssx.create() value must be a static utility string.');
      }
      state.cssRanges.push({ start: value.node.start!, end: value.node.end! });
      result[key] = utilityString;
    }
    return result;
  }

  /**
   * Resolves one props argument to compiled styles that can be folded.
   *
   * It accepts null, false, nested arrays without holes or spreads, and non-computed dot access to a
   * style created in this module. It returns null for ignored null and false values. All unsupported
   * forms, including undefined, return undefined as a sentinel that leaves the props call at runtime.
   *
   * @param node Props argument or nested array element to resolve.
   * @param types Babel node helpers.
   * @returns Compiled styles, null for an ignored input, or undefined when folding must stop.
   */
  function resolveStyleArgument(
    node:
      | import('@babel/types').Expression
      | import('@babel/types').JSXNamespacedName
      | import('@babel/types').SpreadElement
      | import('@babel/types').ArgumentPlaceholder,
    types: typeof t,
  ): readonly CompiledStyle[] | null | undefined {
    if (types.isNullLiteral(node) || types.isBooleanLiteral(node, { value: false })) {
      return null;
    }
    if (types.isArrayExpression(node)) {
      const styles: CompiledStyle[] = [];
      for (const element of node.elements) {
        if (!element || types.isSpreadElement(element)) {
          return undefined;
        }
        const resolved = resolveStyleArgument(element, types);
        if (resolved === undefined) {
          return undefined;
        }
        if (resolved) {
          styles.push(...resolved);
        }
      }
      return styles;
    }
    if (
      !types.isMemberExpression(node) ||
      node.computed ||
      !types.isIdentifier(node.object) ||
      !types.isIdentifier(node.property)
    ) {
      return undefined;
    }
    const map = state.styles.get(node.object.name);
    const style = map?.[node.property.name];
    const candidates = state.styleCandidates.get(node.object.name);
    if (style && candidates) {
      markStyleKeyCandidates(state, candidates, node.property.name);
    }
    return style ? [style] : undefined;
  }

  /** Marks one composite class from a local style map as reachable. */
  function markStyleClass(styleName: string, key: string): void {
    const className = state.styleClasses.get(styleName)?.[key];
    if (className) {
      markEmittedClassNames(className);
    }
  }

  /** Marks every composite class from a local style map as reachable. */
  function markAllStyleClasses(styleName: string): void {
    for (const className of Object.values(state.styleClasses.get(styleName)!)) {
      markEmittedClassNames(className);
    }
  }

  /** Retains every alias or direct atom written into a generated class string. */
  function markEmittedClassNames(classNames: string): void {
    for (const className of classNames.split(/\s+/).filter(Boolean)) {
      if (state.composites.has(className)) {
        state.liveComposites.add(className);
      } else {
        state.liveFallbackClasses.add(className);
      }
    }
  }

  /** Marks atomic fallback classes for one compiled style that survives at runtime. */
  function markFallbackClasses(styleName: string, key: string): void {
    for (const record of state.styles.get(styleName)?.[key]?._ ?? []) {
      if (record[0]) {
        state.liveFallbackClasses.add(record[0]);
      }
    }
  }

  /** Marks atomic fallback classes for every surviving style in one map. */
  function markAllFallbackClasses(styleName: string): void {
    for (const key of Object.keys(state.styles.get(styleName)!)) {
      markFallbackClasses(styleName, key);
    }
  }

  /** Reads a fully static sx input as one utility source. */
  function readStaticSxSource(
    nodes: readonly (
      | import('@babel/types').Expression
      | import('@babel/types').JSXNamespacedName
      | import('@babel/types').SpreadElement
      | import('@babel/types').ArgumentPlaceholder
    )[],
    types: typeof t,
  ): string | null {
    const values: string[] = [];
    for (const node of nodes) {
      if (types.isStringLiteral(node)) {
        values.push(node.value);
      } else if (types.isNullLiteral(node) || types.isBooleanLiteral(node, { value: false })) {
        continue;
      } else if (types.isArrayExpression(node) && node.elements.every((element) => element !== null)) {
        const nested = readStaticSxSource(
          node.elements.filter((element): element is Exclude<typeof element, null> => element !== null),
          types,
        );
        if (nested === null) {
          return null;
        }
        values.push(nested);
      } else {
        return null;
      }
    }
    return values.filter(Boolean).join(' ');
  }
}

/** Converts a compiled style map into the corresponding runtime object expression. */
function styleMapExpression(
  styles: Readonly<Record<string, CompiledStyle>>,
  types: typeof babelTypes,
): import('@babel/types').ObjectExpression {
  return types.valueToNode(styles) as import('@babel/types').ObjectExpression;
}

/** Replaces content-addressed composites with source-addressed development names. */
function withStableCompositeNames(
  result: CompiledStyleRecordMap,
  fileName: string,
  anchor: string,
): CompiledStyleRecordMap {
  const styles: Record<string, CompiledStyle> = Object.create(null) as Record<string, CompiledStyle>;
  const classNames: Record<string, string> = Object.create(null) as Record<string, string>;
  const composites: Record<string, readonly string[]> = Object.create(null) as Record<string, readonly string[]>;
  for (const [name, style] of Object.entries(result.styles)) {
    const className = stableCompositeName(fileName, undefined, `${anchor}:style:${name}`);
    styles[name] = { ...style, c: className };
    classNames[name] = className;
    composites[className] = atomicClassesForStyle(style);
  }
  return { ...result, styles, classNames, composites };
}

/** Extracts every winning atom from one compiled style for an alias selector. */
function atomicClassesForStyle(style: CompiledStyle): readonly string[] {
  return [...new Set(style._.map((record) => record[0]).filter((className): className is string => !!className))];
}

/** Creates a deterministic CSS-safe class name from a source anchor. */
function stableCompositeName(
  fileName: string,
  location: { readonly line: number; readonly column: number } | undefined,
  kind: string,
): string {
  const anchor = `${fileName}\u0000${location?.line ?? 0}\u0000${location?.column ?? 0}\u0000${kind}`;
  let hash = 0xcbf29ce484222325n;
  for (let index = 0; index < anchor.length; index++) {
    hash ^= BigInt(anchor.charCodeAt(index));
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return `d${hash.toString(36)}`;
}

/** Masks CSSX utility literals so an adapter can identify CSS-only source edits. */
function cssOnlySignature(source: string, ranges: readonly { readonly start: number; readonly end: number }[]): string {
  const chunks: string[] = [];
  let position = 0;
  for (const { start, end } of [...ranges].sort((left, right) => left.start - right.start)) {
    chunks.push(source.slice(position, start));
    position = end;
  }
  chunks.push(source.slice(position));
  return chunks.join('');
}
