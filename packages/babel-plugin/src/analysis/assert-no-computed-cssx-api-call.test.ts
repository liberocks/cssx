import * as t from '@babel/types';
import { expect, it } from 'vitest';

import { assertNoComputedCssxApiCall } from './assert-no-computed-cssx-api-call';
import { inspectCalls } from './ast-test-paths';

it('rejects computed API names on CSSX namespaces and ignores other call shapes', () => {
  expect(() =>
    inspectCalls(
      `import * as cssx from '@cssxio/cssx'; import * as other from 'other'; create(); cssx.create(); cssx[key](); cssx['other'](); other['create'](); cssx['create']();`,
      (path) => assertNoComputedCssxApiCall(path, t, '@cssxio/cssx'),
    ),
  ).toThrow('must use dot notation');

  expect(() =>
    inspectCalls(
      `import * as cssx from '@cssxio/cssx'; (getCssx())['create'](); cssx[method](); cssx['other']();`,
      (path) => assertNoComputedCssxApiCall(path, t, '@cssxio/cssx'),
    ),
  ).not.toThrow();
});
