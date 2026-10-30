import { parseSync } from 'oxc-parser';

import { formatUtilityList } from './format-utility-list';
import {
  loadNativeFormatter,
  type NativeCssxFormatter,
  type NativeCssxFormattingLiteral,
} from './load-native-formatter';

export interface FormatSourceOptions {
  readonly filename: string;
  readonly importSource?: string;
}

export interface FormatDiagnostic {
  readonly message: string;
  readonly offset?: number;
}

export interface FormatSourceResult {
  readonly code: string;
  readonly changed: boolean;
  readonly diagnostics: readonly FormatDiagnostic[];
}

type Node = Record<string, any>;
type Binding =
  | { readonly kind: 'direct'; readonly name: 'sx' | 'create' | 'props' }
  | { readonly kind: 'namespace' }
  | { readonly kind: 'shadow' };
type Scope = { readonly parent: Scope | null; readonly bindings: Map<string, Binding> };
type Edit = { readonly start: number; readonly end: number; readonly text: string };

const extensions = new Set([
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.mjs',
  '.mjsx',
  '.mts',
  '.mtsx',
  '.cjs',
  '.cjsx',
  '.cts',
  '.ctsx',
]);

/** Formats CSSX utility literals in recognized imported calls. */
export function formatSource(source: string, options: FormatSourceOptions): FormatSourceResult {
  const { filename, importSource = '@cssxio/cssx' } = options;
  const extension = filename.slice(filename.lastIndexOf('.')).toLowerCase();
  if (!extensions.has(extension)) {
    return { code: source, changed: false, diagnostics: [] };
  }
  if (importSource.length > 0 && !source.includes(importSource) && !hasEscapedFromSpecifier(source)) {
    return { code: source, changed: false, diagnostics: [] };
  }

  const nativeResult = formatSourceWithNativeFormatter(source, options, loadNativeFormatter());
  if (nativeResult) {
    return nativeResult;
  }
  return formatSourceWithParser(source, options, parseSync);
}

function formatSourceWithNativeFormatter(
  source: string,
  options: FormatSourceOptions,
  nativeFormatter: NativeCssxFormatter | undefined,
): FormatSourceResult | undefined {
  if (!nativeFormatter) {
    return undefined;
  }
  try {
    const literals = nativeFormatter.findCssxFormattingLiterals(
      source,
      options.filename,
      options.importSource ?? '@cssxio/cssx',
    );
    return formatSourceWithLiterals(source, literals);
  } catch {
    // Preserve the existing Oxc JavaScript parser's diagnostics as the fallback.
    return undefined;
  }
}

function formatSourceWithParser(
  source: string,
  options: FormatSourceOptions,
  parse: typeof parseSync,
): FormatSourceResult {
  const { filename, importSource = '@cssxio/cssx' } = options;
  const extension = filename.slice(filename.lastIndexOf('.')).toLowerCase();
  if (!extensions.has(extension)) {
    return { code: source, changed: false, diagnostics: [] };
  }
  let parsed: ReturnType<typeof parseSync>;
  try {
    parsed = parse(filename, source, { sourceType: 'module' });
  } catch (error) {
    return { code: source, changed: false, diagnostics: [{ message: errorMessage(error) }] };
  }
  if (parsed.errors.length > 0) {
    return {
      code: source,
      changed: false,
      diagnostics: parsed.errors.map((error) => ({ message: error.message, offset: error.labels[0]?.start })),
    };
  }

  const edits: Edit[] = [];
  const program = parsed.program as Node;
  const rootScope = createScope(program, null, importSource);
  collectUtilityEdits(program, rootScope, source, edits);

  if (edits.length === 0) {
    return { code: source, changed: false, diagnostics: [] };
  }
  edits.sort((left, right) => right.start - left.start);
  let code = source;
  for (const edit of edits) {
    code = `${code.slice(0, edit.start)}${edit.text}${code.slice(edit.end)}`;
  }
  return { code, changed: code !== source, diagnostics: [] };
}

function formatSourceWithLiterals(
  source: string,
  literals: readonly NativeCssxFormattingLiteral[],
): FormatSourceResult {
  const edits: Edit[] = [];
  for (const literal of literals) {
    if (
      !Number.isInteger(literal.start) ||
      !Number.isInteger(literal.end) ||
      literal.start < 0 ||
      literal.end <= literal.start ||
      literal.end > source.length
    ) {
      throw new Error('The native CSSX formatter returned an invalid source range.');
    }
    const quote = source[literal.start]!;
    if (quote !== '"' && quote !== "'" && quote !== '`') {
      throw new Error('The native CSSX formatter returned a range outside a string literal.');
    }
    const formatted = formatUtilityList(literal.value);
    if (formatted !== literal.value) {
      edits.push({ start: literal.start, end: literal.end, text: encodeLiteral(formatted, quote) });
    }
  }

  if (edits.length === 0) {
    return { code: source, changed: false, diagnostics: [] };
  }
  edits.sort((left, right) => right.start - left.start);
  let code = source;
  for (const edit of edits) {
    code = `${code.slice(0, edit.start)}${edit.text}${code.slice(edit.end)}`;
  }
  return { code, changed: code !== source, diagnostics: [] };
}

function hasEscapedFromSpecifier(source: string): boolean {
  let fromIndex = source.indexOf('from');
  while (fromIndex >= 0) {
    const previous = source[fromIndex - 1];
    const next = source[fromIndex + 4];
    if ((!previous || !/[\w$]/.test(previous)) && (!next || !/[\w$]/.test(next))) {
      let cursor = fromIndex + 4;
      while (cursor < source.length) {
        while (cursor < source.length && /\s/.test(source[cursor]!)) {
          cursor += 1;
        }
        if (source.startsWith('//', cursor)) {
          const newline = source.indexOf('\n', cursor + 2);
          cursor = newline < 0 ? source.length : newline + 1;
          continue;
        }
        if (source.startsWith('/*', cursor)) {
          const end = source.indexOf('*/', cursor + 2);
          cursor = end < 0 ? source.length : end + 2;
          continue;
        }
        break;
      }

      const quote = source[cursor];
      if (quote === '"' || quote === "'") {
        for (cursor += 1; cursor < source.length; cursor += 1) {
          const character = source[cursor];
          if (character === '\\') {
            return true;
          }
          if (character === quote) {
            break;
          }
        }
      }
    }
    fromIndex = source.indexOf('from', fromIndex + 4);
  }
  return false;
}

function collectUtilityEdits(program: Node, rootScope: Scope, source: string, edits: Edit[]): void {
  walk(program, rootScope, (node, scope) => {
    if (node.type !== 'CallExpression') {
      return;
    }
    const name = resolveCall(node.callee, scope);
    if (name === 'sx' || name === 'props') {
      for (const argument of node.arguments ?? []) {
        formatValueExpression(argument, source, edits);
      }
    } else if (name === 'create') {
      const firstArgument = node.arguments?.[0];
      if (firstArgument?.type === 'ObjectExpression') {
        for (const property of firstArgument.properties ?? []) {
          if (property.type === 'Property' && property.kind === 'init') {
            formatLiteral(property.value, source, edits);
          }
        }
      }
    }
  });
}

function formatValueExpression(node: Node | undefined, source: string, edits: Edit[]): void {
  if (!node || typeof node !== 'object') {
    return;
  }
  if (node.type === 'Literal' || node.type === 'StringLiteral' || node.type === 'TemplateLiteral') {
    formatLiteral(node, source, edits);
    return;
  }
  if (node.type === 'ArrayExpression') {
    for (const element of node.elements ?? []) {
      formatValueExpression(element, source, edits);
    }
    return;
  }
  if (node.type === 'ConditionalExpression') {
    formatValueExpression(node.consequent, source, edits);
    formatValueExpression(node.alternate, source, edits);
    return;
  }
  if (node.type === 'LogicalExpression') {
    formatValueExpression(node.left, source, edits);
    formatValueExpression(node.right, source, edits);
    return;
  }
  if (
    node.type === 'ParenthesizedExpression' ||
    node.type === 'TSAsExpression' ||
    node.type === 'TSSatisfiesExpression'
  ) {
    formatValueExpression(node.expression, source, edits);
  }
}

function formatLiteral(node: Node, source: string, edits: Edit[]): void {
  if (node.type === 'TemplateLiteral' && node.expressions?.length) {
    return;
  }
  let value: string;
  let quote: string;
  if ((node.type === 'Literal' || node.type === 'StringLiteral') && typeof node.value === 'string') {
    value = node.value;
    quote = source[node.start]!;
  } else if (node.type === 'TemplateLiteral') {
    value = node.quasis[0]!.value.cooked as string;
    quote = '`';
  } else {
    return;
  }
  const formatted = formatUtilityList(value);
  if (formatted === value) {
    return;
  }
  edits.push({ start: node.start, end: node.end, text: encodeLiteral(formatted, quote) });
}

function encodeLiteral(value: string, quote: string): string {
  const encoded = value
    .replaceAll('\\', '\\\\')
    .replaceAll('\n', '\\n')
    .replaceAll('\r', '\\r')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029')
    .replaceAll(quote, `\\${quote}`);
  return `${quote}${quote === '`' ? encoded.replaceAll('${', '\\${') : encoded}${quote}`;
}

function createScope(node: Node, parent: Scope | null, importSource: string): Scope {
  const scope: Scope = { parent, bindings: new Map() };
  if (node.type === 'Program') {
    for (const statement of node.body ?? []) {
      if (statement.type === 'ImportDeclaration' && statement.source?.value === importSource) {
        for (const specifier of statement.specifiers ?? []) {
          if (specifier.type === 'ImportSpecifier') {
            const imported = identifierName(specifier.imported);
            if (imported === 'sx' || imported === 'create' || imported === 'props') {
              scope.bindings.set(identifierName(specifier.local), { kind: 'direct', name: imported });
            }
          } else if (specifier.type === 'ImportNamespaceSpecifier') {
            scope.bindings.set(identifierName(specifier.local), { kind: 'namespace' });
          } else {
            scope.bindings.set(identifierName(specifier.local), { kind: 'shadow' });
          }
        }
      }
    }
  }
  collectScopeDeclarations(node, scope);
  return scope;
}

function collectScopeDeclarations(node: Node, scope: Scope): void {
  const addPattern = (pattern: Node | undefined) => {
    for (const name of patternNames(pattern)) {
      if (!scope.bindings.has(name)) {
        scope.bindings.set(name, { kind: 'shadow' });
      }
    }
  };
  if (isFunction(node)) {
    addPattern(node.id);
    for (const parameter of node.params ?? []) {
      addPattern(parameter.type === 'FormalParameter' ? parameter.pattern : parameter);
    }
    collectVarDeclarations(node.body, scope);
    return;
  }
  if (node.type === 'CatchClause') {
    addPattern(node.param);
  }
  if (node.type === 'ForStatement') {
    collectDeclaration(node.init, addPattern);
  }
  if (node.type === 'ForInStatement' || node.type === 'ForOfStatement') {
    collectDeclaration(node.left, addPattern);
  }
  if (node.type === 'SwitchStatement') {
    for (const branch of node.cases ?? []) {
      for (const statement of branch.consequent ?? []) {
        collectLexical(statement, addPattern);
      }
    }
  }
  const children =
    node.type === 'Program' ? (node.body ?? []) : node.type === 'BlockStatement' ? (node.body ?? []) : [];
  for (const statement of children) {
    collectLexical(statement, addPattern);
  }
  if (node.type === 'Program') {
    collectVarDeclarations(node, scope);
  }
}

function collectLexical(node: Node, addPattern: (pattern?: Node) => void): void {
  if (node.type === 'VariableDeclaration' && node.kind !== 'var') {
    for (const declaration of node.declarations ?? []) {
      addPattern(declaration.id);
    }
  } else if (node.type === 'FunctionDeclaration' || node.type === 'ClassDeclaration') {
    addPattern(node.id);
  }
}

function collectDeclaration(node: Node | undefined, addPattern: (pattern?: Node) => void): void {
  if (node?.type === 'VariableDeclaration') {
    for (const declaration of node.declarations ?? []) {
      addPattern(declaration.id);
    }
  }
}

function collectVarDeclarations(node: Node | undefined, scope: Scope): void {
  if (!node || typeof node !== 'object') {
    return;
  }
  if (isFunction(node) && node.type !== 'Program') {
    return;
  }
  if (node.type === 'VariableDeclaration' && node.kind === 'var') {
    for (const declaration of node.declarations ?? []) {
      for (const name of patternNames(declaration.id)) {
        if (!scope.bindings.has(name)) {
          scope.bindings.set(name, { kind: 'shadow' });
        }
      }
    }
  }
  for (const child of childNodes(node)) {
    collectVarDeclarations(child, scope);
  }
}

function walk(node: Node, scope: Scope, visit: (node: Node, scope: Scope) => void): void {
  let activeScope = scope;
  if (
    node.type !== 'Program' &&
    (node.type === 'BlockStatement' ||
      isFunction(node) ||
      node.type === 'CatchClause' ||
      node.type === 'ForStatement' ||
      node.type === 'ForInStatement' ||
      node.type === 'ForOfStatement' ||
      node.type === 'SwitchStatement')
  ) {
    activeScope = createScope(node, scope, '');
  }
  visit(node, activeScope);
  for (const child of childNodes(node)) {
    walk(child, activeScope, visit);
  }
}

function resolveCall(callee: Node, scope: Scope): 'sx' | 'create' | 'props' | null {
  if (callee.type === 'Identifier') {
    const binding = resolveBinding(identifierName(callee), scope);
    return binding?.kind === 'direct' ? binding.name : null;
  }
  if (callee.type === 'StaticMemberExpression' || callee.type === 'MemberExpression') {
    if (callee.computed) {
      return null;
    }
    const property = identifierName(callee.property);
    if (property !== 'sx' && property !== 'create' && property !== 'props') {
      return null;
    }
    const object = callee.object;
    if (object?.type !== 'Identifier') {
      return null;
    }
    return resolveBinding(identifierName(object), scope)?.kind === 'namespace' ? property : null;
  }
  return null;
}

function resolveBinding(name: string, scope: Scope): Binding | undefined {
  for (let current: Scope | null = scope; current; current = current.parent) {
    const binding = current.bindings.get(name);
    if (binding) {
      return binding;
    }
  }
  return undefined;
}

function patternNames(pattern: Node | undefined): string[] {
  if (!pattern) {
    return [];
  }
  if (pattern.type === 'Identifier') {
    return [identifierName(pattern)];
  }
  if (
    pattern.type === 'RestElement' ||
    pattern.type === 'AssignmentPattern' ||
    pattern.type === 'TSParameterProperty'
  ) {
    return patternNames(pattern.argument ?? pattern.left ?? pattern.parameter ?? pattern.parameter?.pattern);
  }
  if (pattern.type === 'ObjectPattern') {
    return (pattern.properties ?? []).flatMap((property: Node) => patternNames(property.value ?? property.argument));
  }
  if (pattern.type === 'ArrayPattern') {
    return (pattern.elements ?? []).flatMap((element: Node | null) => patternNames(element ?? undefined));
  }
  return [];
}

function childNodes(node: Node): Node[] {
  const children: Node[] = [];
  for (const [key, value] of Object.entries(node)) {
    if (
      key === 'type' ||
      key === 'start' ||
      key === 'end' ||
      key === 'loc' ||
      key === 'raw' ||
      key === 'comments' ||
      key === 'errors'
    ) {
      continue;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        if (isNode(item)) {
          children.push(item);
        }
      }
    } else if (isNode(value)) {
      children.push(value);
    }
  }
  return children;
}

function isNode(value: unknown): value is Node {
  return typeof value === 'object' && value !== null && 'type' in value && typeof (value as Node).type === 'string';
}

function isFunction(node: Node): boolean {
  return (
    node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression'
  );
}

function identifierName(node: Node | undefined): string {
  if (!node) {
    return '';
  }
  return typeof node.name === 'string' ? node.name : typeof node.value === 'string' ? node.value : '';
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Internal helpers exposed only from this source module for focused unit coverage. */
export const formatSourceInternals = {
  formatSourceWithParser,
  formatSourceWithNativeFormatter,
  formatSourceWithLiterals,
  hasEscapedFromSpecifier,
  collectUtilityEdits,
  formatValueExpression,
  formatLiteral,
  encodeLiteral,
  createScope,
  collectScopeDeclarations,
  collectLexical,
  collectDeclaration,
  collectVarDeclarations,
  walk,
  resolveCall,
  resolveBinding,
  patternNames,
  childNodes,
  isNode,
  isFunction,
  identifierName,
  errorMessage,
};
