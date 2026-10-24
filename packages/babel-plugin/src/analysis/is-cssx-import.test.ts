import { expect, it } from 'vitest';

import { inspectCalls } from './ast-test-paths';
import { isCssxImport } from './is-cssx-import';

it('recognizes only bindings directly imported from the configured CSSX module', () => {
  const [results] = inspectCalls(
    `import { sx } from '@cssxio/cssx'; function sxLocal() {} sx('p-4'); sxLocal();`,
    (path) => {
      const importedPath = path.scope.getBinding('sx')!.path;
      const localPath = path.scope.getBinding('sxLocal')!.path;
      return [
        isCssxImport(importedPath, '@cssxio/cssx'),
        isCssxImport(importedPath, '@other/cssx'),
        isCssxImport(localPath, '@cssxio/cssx'),
      ];
    },
  );

  expect(results).toEqual([true, false, false]);
});
