import * as t from '@babel/types';
import { expect, it } from 'vitest';

import { inspectCalls } from './ast-test-paths';
import { isPropsCall } from './is-props-call';

it('recognizes named props imports and does not match other API methods', () => {
  const results = inspectCalls(
    `import { props as merge } from '@cssxio/cssx'; import * as cssx from '@cssxio/cssx'; merge(); cssx.props(); cssx.create();`,
    (path) => isPropsCall(path, t, '@cssxio/cssx'),
  );

  expect(results).toEqual([true, true, false]);
});
