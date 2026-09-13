import { expect, it } from 'vitest';

import { assertModuleScope } from './assert-module-scope';
import { inspectCalls } from './ast-test-paths';

it('accepts module and exported statements and rejects function-local create calls', () => {
  expect(() =>
    inspectCalls(
      `cssx.create({}); export const styles = cssx.create({}); function nested() { return cssx.create({}); }`,
      (path) => assertModuleScope(path),
    ),
  ).toThrow('must be declared at module scope');
});
