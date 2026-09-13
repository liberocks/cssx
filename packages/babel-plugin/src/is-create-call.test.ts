import * as t from '@babel/types';
import { expect, it } from 'vitest';

import { inspectCalls } from './ast-test-paths';
import { isCreateCall } from './is-create-call';

it('recognizes direct and aliased create imports', () => {
  const results = inspectCalls(
    `import { create as make } from '@cssxio/cssx'; import * as cssx from '@cssxio/cssx'; make(); cssx.create();`,
    (path) => isCreateCall(path, t, '@cssxio/cssx'),
  );

  expect(results).toEqual([true, true]);
});
