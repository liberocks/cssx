import * as t from '@babel/types';
import { expect, it } from 'vitest';

import { inspectCalls } from './ast-test-paths';
import { importedFunctionBinding } from './imported-function-binding';

it('matches named and string-named CSSX imports by their local bindings', () => {
  const results = inspectCalls(
    `import { create as make, props, "sx" as makeSx } from '@cssxio/cssx'; import { create as other } from 'other'; make(); props(); makeSx(); other(); missing();`,
    (path) => [
      importedFunctionBinding(path, 'make', 'create', t, '@cssxio/cssx'),
      importedFunctionBinding(path, 'props', 'props', t, '@cssxio/cssx'),
      importedFunctionBinding(path, 'makeSx', 'sx', t, '@cssxio/cssx'),
      importedFunctionBinding(path, 'other', 'create', t, '@cssxio/cssx'),
      importedFunctionBinding(path, 'missing', 'create', t, '@cssxio/cssx'),
    ],
  );

  expect(results[0]).toEqual([true, true, true, false, false]);
});
