import * as t from '@babel/types';
import { expect, it } from 'vitest';

import { inspectCalls } from './ast-test-paths';
import { isSxCall } from './is-sx-call';

it('recognizes named sx imports and does not match other API methods', () => {
  const results = inspectCalls(
    `import { sx as styles } from '@cssxio/cssx'; import * as cssx from '@cssxio/cssx'; styles('p-4'); cssx.sx('p-4'); cssx.create({});`,
    (path) => isSxCall(path, t, '@cssxio/cssx'),
  );

  expect(results).toEqual([true, true, false]);
});
