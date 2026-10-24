import * as t from '@babel/types';
import { expect, it } from 'vitest';

import { inspectCalls } from './ast-test-paths';
import { isCssxApiCall } from './is-cssx-api-call';

it('matches supported named and namespace API calls while rejecting unrelated calls', () => {
  const results = inspectCalls(
    `import { create as make } from '@cssxio/cssx'; import * as cssx from '@cssxio/cssx'; import * as other from 'other'; make(); cssx.create(); cssx['create'](); other.create(); create();`,
    (path) => isCssxApiCall(path, t, '@cssxio/cssx', 'create'),
  );

  expect(results).toEqual([true, true, false, false, false]);
});
