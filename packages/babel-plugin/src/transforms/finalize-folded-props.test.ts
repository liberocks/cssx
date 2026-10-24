import { transformSync } from '@babel/core';
import type { NodePath } from '@babel/core';
import type { CallExpression, Program } from '@babel/types';
import { expect, it } from 'vitest';

import { finalizeFoldedProps } from './finalize-folded-props';

/** Replaces calls named `fold` with one or more compiled props records. */
function transformFoldedCalls(source: string, classNames: readonly string[]): string {
  return (
    transformSync(source, {
      babelrc: false,
      configFile: false,
      plugins: [
        (api) => ({
          visitor: {
            Program: {
              exit(program: NodePath<Program>) {
                const foldedProps: { path: NodePath<CallExpression>; className: string }[] = [];
                program.traverse({
                  CallExpression(path: NodePath<CallExpression>) {
                    if (path.get('callee').isIdentifier({ name: 'fold' })) {
                      const className = classNames[foldedProps.length];
                      if (className !== undefined) {
                        foldedProps.push({ path, className });
                      }
                    }
                  },
                });
                finalizeFoldedProps(program, api.types, foldedProps);
              },
            },
          },
        }),
      ],
    })?.code ?? ''
  );
}

it('leaves the program unchanged when no calls were folded', () => {
  expect(transformFoldedCalls('const value = fold();', [])).toBe('const value = fold();');
});

it('inlines one className record per folded call below the helper threshold', () => {
  expect(transformFoldedCalls('const first = fold(); const second = fold();', ['c0', 'c1'])).toContain(
    'const first = {\n  className: "c0"\n};',
  );
  expect(transformFoldedCalls('const first = fold();', ['c0'])).not.toContain('cssxProps');
});

it('creates one shared props helper when at least four calls were folded', () => {
  const output = transformFoldedCalls(
    'const first = fold(); const second = fold(); const third = fold(); const fourth = fold();',
    ['c0', 'c1', 'c2', 'c3'],
  );

  expect(output).toContain('const _cssxProps = className => ({\n  className: className\n});');
  expect(output).toContain('const fourth = _cssxProps("c3");');
});
