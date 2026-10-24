import { expect, it } from 'vitest';

import { inspectCalls } from './ast-test-paths';
import { importedNamespaceBinding } from './imported-namespace-binding';

it('matches namespace and default CSSX imports but rejects other binding kinds', () => {
  const [results] = inspectCalls(
    `import * as cssx from '@cssxio/cssx'; import cssxDefault from '@cssxio/cssx'; import { sx } from '@cssxio/cssx'; import * as other from 'other'; cssx.create(); cssxDefault.create(); sx(); other.create();`,
    (path) => [
      importedNamespaceBinding(path, 'cssx', '@cssxio/cssx'),
      importedNamespaceBinding(path, 'cssxDefault', '@cssxio/cssx'),
      importedNamespaceBinding(path, 'sx', '@cssxio/cssx'),
      importedNamespaceBinding(path, 'other', '@cssxio/cssx'),
    ],
  );

  expect(results).toEqual([true, true, false, false]);
});
