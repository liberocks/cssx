import type { parseSync } from 'oxc-parser';
import { describe, expect, it } from 'vitest';

import { formatSourceInternals as internals } from '../../src/format-source';

const utility = 'bg-white   p-4';
const literal = { type: 'Literal', value: utility, start: 0, end: utility.length + 2 };

describe('format-source internals', () => {
  it('walks supported value-expression shapes and ignores dynamic or unrelated expressions', () => {
    const edits: Array<{ start: number; end: number; text: string }> = [];
    internals.formatValueExpression(undefined, `"${utility}"`, edits);
    internals.formatValueExpression(null as never, `"${utility}"`, edits);
    internals.formatValueExpression({ ...literal, value: 4 }, `"${utility}"`, edits);
    internals.formatValueExpression(
      { type: 'ArrayExpression', elements: [null, { type: 'Identifier' }, literal] },
      `"${utility}"`,
      edits,
    );
    internals.formatValueExpression(
      { type: 'ConditionalExpression', consequent: literal, alternate: literal },
      `"${utility}"`,
      edits,
    );
    internals.formatValueExpression(
      { type: 'LogicalExpression', left: { type: 'Identifier' }, right: literal },
      `"${utility}"`,
      edits,
    );
    internals.formatValueExpression({ type: 'ParenthesizedExpression', expression: literal }, `"${utility}"`, edits);
    internals.formatValueExpression({ type: 'TSAsExpression', expression: literal }, `"${utility}"`, edits);
    internals.formatValueExpression({ type: 'TSSatisfiesExpression', expression: literal }, `"${utility}"`, edits);
    internals.formatValueExpression({ type: 'Identifier', name: 'reference' }, `"${utility}"`, edits);
    internals.formatValueExpression(
      { type: 'TemplateLiteral', expressions: [{ type: 'Identifier' }], quasis: [{ value: { cooked: utility } }] },
      `\`${utility}\``,
      edits,
    );
    internals.formatValueExpression(
      { type: 'TemplateLiteral', expressions: [], quasis: [{ value: { cooked: utility } }] },
      `\`${utility}\``,
      edits,
    );
    expect(edits.length).toBeGreaterThan(0);
  });

  it('formats and skips individual literal forms and escapes every source-sensitive character', () => {
    const edits: Array<{ start: number; end: number; text: string }> = [];
    internals.formatLiteral({ ...literal, value: 'p-4' }, `"p-4"`, edits);
    internals.formatLiteral({ type: 'Literal', value: 7, start: 0, end: 1 }, '7', edits);
    internals.formatLiteral({ type: 'UnknownLiteral' }, '', edits);
    internals.formatLiteral({ ...literal, start: 1 }, `"${utility}"`, edits);
    internals.formatLiteral(
      {
        type: 'TemplateLiteral',
        expressions: [],
        quasis: [{ value: { cooked: utility } }],
        start: 0,
        end: utility.length + 2,
      },
      `\`${utility}\``,
      edits,
    );
    expect(edits.some(({ text }) => text.startsWith('`'))).toBe(true);
    const escaped = internals.encodeLiteral('\\\n\r\u2028\u2029\'"${', '`');
    expect(escaped).toContain('\\n\\r\\u2028\\u2029');
    expect(escaped).toContain('\\${');
    expect(internals.encodeLiteral('a"b', '"')).toBe('"a\\"b"');
  });

  it('resolves named, aliased, namespace, default, and unrelated imports', () => {
    const program = {
      type: 'Program',
      body: [
        {
          type: 'ImportDeclaration',
          source: { value: '@cssxio/cssx' },
          specifiers: [
            { type: 'ImportSpecifier', imported: { name: 'sx' }, local: { name: 'styles' } },
            { type: 'ImportSpecifier', imported: { value: 'props' }, local: { name: 'join' } },
            { type: 'ImportSpecifier', imported: { name: 'unknown' }, local: { name: 'unknown' } },
            { type: 'ImportNamespaceSpecifier', local: { name: 'cssx' } },
            { type: 'ImportDefaultSpecifier', local: { name: 'runtime' } },
          ],
        },
        {
          type: 'ImportDeclaration',
          source: { value: 'other-package' },
          specifiers: [{ type: 'ImportNamespaceSpecifier', local: { name: 'other' } }],
        },
      ],
    };
    const scope = internals.createScope(program, null, '@cssxio/cssx');
    expect(internals.resolveCall({ type: 'Identifier', name: 'styles' }, scope)).toBe('sx');
    expect(internals.resolveCall({ type: 'Identifier', name: 'join' }, scope)).toBe('props');
    expect(internals.resolveCall({ type: 'Identifier', name: 'unknown' }, scope)).toBeNull();
    expect(
      internals.resolveCall(
        {
          type: 'StaticMemberExpression',
          computed: false,
          object: { type: 'Identifier', name: 'cssx' },
          property: { type: 'Identifier', name: 'sx' },
        },
        scope,
      ),
    ).toBe('sx');
    expect(
      internals.resolveCall(
        {
          type: 'MemberExpression',
          computed: false,
          object: { type: 'Identifier', name: 'cssx' },
          property: { type: 'Identifier', name: 'props' },
        },
        scope,
      ),
    ).toBe('props');
    expect(
      internals.resolveCall(
        {
          type: 'MemberExpression',
          computed: true,
          object: { type: 'Identifier', name: 'cssx' },
          property: { type: 'Identifier', name: 'sx' },
        },
        scope,
      ),
    ).toBeNull();
    expect(
      internals.resolveCall(
        {
          type: 'StaticMemberExpression',
          computed: false,
          object: { type: 'ThisExpression' },
          property: { type: 'Identifier', name: 'sx' },
        },
        scope,
      ),
    ).toBeNull();
    expect(
      internals.resolveCall(
        {
          type: 'StaticMemberExpression',
          computed: false,
          object: { type: 'Identifier', name: 'runtime' },
          property: { type: 'Identifier', name: 'sx' },
        },
        scope,
      ),
    ).toBeNull();
    expect(
      internals.resolveCall(
        {
          type: 'StaticMemberExpression',
          computed: false,
          object: { type: 'Identifier', name: 'cssx' },
          property: { type: 'Identifier', name: 'unknown' },
        },
        scope,
      ),
    ).toBeNull();
    expect(
      internals.resolveCall({ type: 'CallExpression', callee: { type: 'Identifier', name: 'factory' } }, scope),
    ).toBeNull();
    expect(internals.resolveBinding('styles', scope)).toMatchObject({ kind: 'direct', name: 'sx' });
    expect(internals.resolveBinding('missing', scope)).toBeUndefined();
  });

  it('collects lexical, loop, catch, switch, and var bindings through nested scopes', () => {
    const root = internals.createScope({ type: 'Program', body: [] }, null, '@cssxio/cssx');
    const block = internals.createScope(
      {
        type: 'BlockStatement',
        body: [
          {
            type: 'VariableDeclaration',
            kind: 'let',
            declarations: [{ id: { type: 'Identifier', name: 'blockName' } }],
          },
          { type: 'FunctionDeclaration', id: { type: 'Identifier', name: 'functionName' } },
          { type: 'ClassDeclaration', id: { type: 'Identifier', name: 'className' } },
        ],
      },
      root,
      '',
    );
    expect(internals.resolveBinding('blockName', block)?.kind).toBe('shadow');
    expect(internals.resolveBinding('functionName', block)?.kind).toBe('shadow');
    expect(internals.resolveBinding('className', block)?.kind).toBe('shadow');
    expect(internals.resolveBinding('blockName', root)).toBeUndefined();

    const functionScope = internals.createScope(
      {
        type: 'FunctionDeclaration',
        id: { type: 'Identifier', name: 'named' },
        params: [
          { type: 'FormalParameter', pattern: { type: 'Identifier', name: 'formal' } },
          { type: 'Identifier', name: 'plain' },
          { type: 'RestElement', argument: { type: 'Identifier', name: 'rest' } },
          {
            type: 'AssignmentPattern',
            left: { type: 'Identifier', name: 'defaulted' },
            right: { type: 'NullLiteral' },
          },
          {
            type: 'ObjectPattern',
            properties: [{ type: 'Property', value: { type: 'Identifier', name: 'objectName' } }],
          },
          { type: 'ArrayPattern', elements: [{ type: 'Identifier', name: 'arrayName' }, null] },
          { type: 'TSParameterProperty', parameter: { type: 'Identifier', name: 'propertyName' } },
        ],
        body: {
          type: 'BlockStatement',
          body: [
            {
              type: 'IfStatement',
              consequent: {
                type: 'BlockStatement',
                body: [
                  {
                    type: 'VariableDeclaration',
                    kind: 'var',
                    declarations: [{ id: { type: 'Identifier', name: 'hoisted' } }],
                  },
                ],
              },
            },
          ],
        },
      },
      root,
      '',
    );
    for (const name of [
      'named',
      'formal',
      'plain',
      'rest',
      'defaulted',
      'objectName',
      'arrayName',
      'propertyName',
      'hoisted',
    ]) {
      expect(internals.resolveBinding(name, functionScope)?.kind, name).toBe('shadow');
    }

    const catchScope = internals.createScope(
      { type: 'CatchClause', param: { type: 'Identifier', name: 'caught' } },
      root,
      '',
    );
    expect(internals.resolveBinding('caught', catchScope)?.kind).toBe('shadow');
    const forScope = internals.createScope(
      {
        type: 'ForStatement',
        init: { type: 'VariableDeclaration', declarations: [{ id: { type: 'Identifier', name: 'forName' } }] },
      },
      root,
      '',
    );
    const ofScope = internals.createScope(
      {
        type: 'ForOfStatement',
        left: { type: 'VariableDeclaration', declarations: [{ id: { type: 'Identifier', name: 'ofName' } }] },
      },
      root,
      '',
    );
    const inScope = internals.createScope(
      {
        type: 'ForInStatement',
        left: { type: 'VariableDeclaration', declarations: [{ id: { type: 'Identifier', name: 'inName' } }] },
      },
      root,
      '',
    );
    const switchScope = internals.createScope(
      {
        type: 'SwitchStatement',
        cases: [
          {
            consequent: [
              {
                type: 'VariableDeclaration',
                kind: 'const',
                declarations: [{ id: { type: 'Identifier', name: 'switchName' } }],
              },
            ],
          },
        ],
      },
      root,
      '',
    );
    expect(internals.resolveBinding('forName', forScope)?.kind).toBe('shadow');
    expect(internals.resolveBinding('ofName', ofScope)?.kind).toBe('shadow');
    expect(internals.resolveBinding('inName', inScope)?.kind).toBe('shadow');
    expect(internals.resolveBinding('switchName', switchScope)?.kind).toBe('shadow');
    internals.collectScopeDeclarations({ type: 'BlockStatement', body: [] }, root);
    internals.collectLexical({ type: 'VariableDeclaration', kind: 'var', declarations: [] }, () => undefined);
    internals.collectLexical({ type: 'ExpressionStatement' }, () => undefined);
    internals.collectDeclaration(undefined, () => undefined);
    internals.collectDeclaration(
      { type: 'VariableDeclaration', declarations: [{ id: { type: 'Identifier', name: 'declared' } }] },
      () => undefined,
    );
    internals.collectVarDeclarations(undefined, root);
    internals.collectVarDeclarations('not a node' as never, root);
    internals.collectVarDeclarations(
      {
        type: 'Program',
        body: [
          { type: 'FunctionDeclaration', id: { type: 'Identifier', name: 'nested' }, body: { type: 'BlockStatement' } },
        ],
      },
      root,
    );
    internals.collectVarDeclarations(
      {
        type: 'Program',
        body: [
          {
            type: 'VariableDeclaration',
            kind: 'var',
            declarations: [{ id: { type: 'Identifier', name: 'topLevelVar' } }],
          },
        ],
      },
      root,
    );
    expect(internals.resolveBinding('topLevelVar', root)?.kind).toBe('shadow');
    internals.collectVarDeclarations(
      {
        type: 'Program',
        body: [
          {
            type: 'VariableDeclaration',
            kind: 'var',
            declarations: [{ id: { type: 'Identifier', name: 'topLevelVar' } }],
          },
        ],
      },
      root,
    );
    internals.collectScopeDeclarations(
      {
        type: 'BlockStatement',
        body: [
          {
            type: 'VariableDeclaration',
            kind: 'let',
            declarations: [{ id: { type: 'Identifier', name: 'duplicate' } }],
          },
          {
            type: 'VariableDeclaration',
            kind: 'let',
            declarations: [{ id: { type: 'Identifier', name: 'duplicate' } }],
          },
        ],
      },
      root,
    );
    internals.collectScopeDeclarations(
      { type: 'FunctionDeclaration', id: { type: 'Identifier', name: 'noParams' } },
      root,
    );
    internals.collectScopeDeclarations({ type: 'SwitchStatement', cases: [{ consequent: [] }, {}] }, root);
    internals.collectScopeDeclarations({ type: 'SwitchStatement' }, root);
    internals.collectScopeDeclarations({ type: 'Program' }, root);
    internals.collectScopeDeclarations({ type: 'BlockStatement' }, root);
    internals.collectLexical({ type: 'VariableDeclaration' }, () => undefined);
    internals.collectDeclaration({ type: 'VariableDeclaration' }, () => undefined);
    internals.collectVarDeclarations({ type: 'VariableDeclaration', kind: 'var' }, root);
    internals.createScope({ type: 'Program' }, null, '@cssxio/cssx');
    internals.createScope(
      {
        type: 'Program',
        body: [{ type: 'ImportDeclaration', source: { value: '@cssxio/cssx' } }],
      },
      null,
      '@cssxio/cssx',
    );
  });

  it('walks AST child containers and identifies node, function, and binding shapes', () => {
    const child = { type: 'Child' };
    expect(
      internals.childNodes({
        type: 'Root',
        start: 0,
        end: 1,
        loc: child,
        raw: 'raw',
        comments: [],
        errors: [],
        array: [null, 1, child],
        direct: child,
        primitive: 'x',
      }),
    ).toEqual([child, child]);
    expect(internals.isNode(null)).toBe(false);
    expect(internals.isNode(1)).toBe(false);
    expect(internals.isNode({})).toBe(false);
    expect(internals.isNode({ type: 1 })).toBe(false);
    expect(internals.isNode(child)).toBe(true);
    expect(internals.isFunction({ type: 'FunctionDeclaration' })).toBe(true);
    expect(internals.isFunction({ type: 'FunctionExpression' })).toBe(true);
    expect(internals.isFunction({ type: 'ArrowFunctionExpression' })).toBe(true);
    expect(internals.isFunction({ type: 'ClassDeclaration' })).toBe(false);
    expect(internals.identifierName(undefined)).toBe('');
    expect(internals.identifierName({ name: 'named' })).toBe('named');
    expect(internals.identifierName({ value: 'literal' })).toBe('literal');
    expect(internals.identifierName({})).toBe('');
    expect(internals.patternNames(undefined)).toEqual([]);
    expect(internals.patternNames({ type: 'Identifier', name: 'id' })).toEqual(['id']);
    expect(internals.patternNames({ type: 'RestElement', argument: { type: 'Identifier', name: 'rest' } })).toEqual([
      'rest',
    ]);
    expect(
      internals.patternNames({ type: 'AssignmentPattern', left: { type: 'Identifier', name: 'defaulted' } }),
    ).toEqual(['defaulted']);
    expect(
      internals.patternNames({ type: 'TSParameterProperty', parameter: { type: 'Identifier', name: 'property' } }),
    ).toEqual(['property']);
    expect(internals.patternNames({ type: 'TSParameterProperty' })).toEqual([]);
    expect(
      internals.patternNames({
        type: 'ObjectPattern',
        properties: [
          { value: { type: 'Identifier', name: 'value' } },
          { argument: { type: 'Identifier', name: 'rest' } },
        ],
      }),
    ).toEqual(['value', 'rest']);
    expect(internals.patternNames({ type: 'ObjectPattern', properties: [] })).toEqual([]);
    expect(
      internals.patternNames({ type: 'ArrayPattern', elements: [{ type: 'Identifier', name: 'item' }, null] }),
    ).toEqual(['item']);
    expect(internals.patternNames({ type: 'ArrayPattern', elements: [] })).toEqual([]);
    expect(internals.patternNames({ type: 'MemberExpression' })).toEqual([]);
    expect(internals.errorMessage(new Error('failure'))).toBe('failure');
    expect(internals.errorMessage('failure')).toBe('failure');
  });

  it('covers parser recovery and omitted parser fields without producing edits', () => {
    const parserFailure = internals.formatSourceWithParser('sx("p-4 bg-white")', { filename: 'example.tsx' }, (() => {
      throw new Error('parser failure');
    }) as typeof parseSync);
    expect(parserFailure).toMatchObject({ changed: false, diagnostics: [{ message: 'parser failure' }] });

    const root = internals.createScope(
      {
        type: 'Program',
        body: [
          {
            type: 'ImportDeclaration',
            source: { value: '@cssxio/cssx' },
            specifiers: [
              { type: 'ImportSpecifier', imported: { name: 'sx' }, local: { name: 'sx' } },
              { type: 'ImportSpecifier', imported: { name: 'create' }, local: { name: 'create' } },
            ],
          },
        ],
      },
      null,
      '@cssxio/cssx',
    );
    const call = (name: string, args?: unknown[]) => ({
      type: 'CallExpression',
      callee: { type: 'Identifier', name },
      ...(args ? { arguments: args } : {}),
    });
    internals.collectUtilityEdits(
      {
        type: 'Program',
        body: [
          call('sx'),
          call('sx', [{ type: 'ArrayExpression' }]),
          call('create'),
          call('create', [{ type: 'Identifier', name: 'styles' }]),
          call('create', [{ type: 'ObjectExpression' }]),
          call('create', [
            { type: 'ObjectExpression', properties: [{ type: 'SpreadElement' }, { type: 'Property', kind: 'get' }] },
          ]),
        ],
      },
      root,
      '',
      [],
    );
    internals.formatValueExpression({ type: 'ArrayExpression' }, '', []);
    expect(internals.patternNames({ type: 'ObjectPattern', properties: [{ type: 'Property' }] })).toEqual([]);
    expect(internals.patternNames({ type: 'ObjectPattern' })).toEqual([]);
    expect(internals.patternNames({ type: 'ArrayPattern', elements: [null] })).toEqual([]);
    expect(internals.patternNames({ type: 'ArrayPattern' })).toEqual([]);
  });
});
