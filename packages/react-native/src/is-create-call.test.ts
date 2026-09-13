import { transformSync, type NodePath } from '@babel/core';
import * as types from '@babel/types';
import type { CallExpression } from '@babel/types';
import { expect, it } from 'vitest';

import { isCreateCall } from './is-create-call';

it('recognizes only direct named create imports from the configured runtime', () => {
  const results: boolean[] = [];
  transformSync(
    `import { create as make } from '@cssxio/react-native'; import { create as foreign } from 'other'; import { props as notCreate } from '@cssxio/react-native'; import * as cssx from '@cssxio/react-native'; make({}); foreign({}); notCreate({}); cssx.create({}); missing();`,
    {
      babelrc: false,
      configFile: false,
      plugins: [
        () => ({
          visitor: {
            CallExpression(path: NodePath<CallExpression>) {
              results.push(isCreateCall(path, '@cssxio/react-native', types));
            },
          },
        }),
      ],
    },
  );

  expect(results).toEqual([true, false, false, false, false]);
});
