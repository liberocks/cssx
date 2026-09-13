import { expect, it } from 'vitest';

import {
  approvedDependencies,
  dependencyFields,
  packageDirectories,
  publicExports,
  workspaceRoot,
} from './package-contract-data';

it('keeps public package metadata internally consistent', () => {
  expect(publicExports.map(({ specifier }) => specifier)).toContain('@cssxio/cssx');
  expect(new Set(publicExports.map(({ specifier }) => specifier)).size).toBe(publicExports.length);
  expect(packageDirectories).toEqual(
    expect.arrayContaining(['packages/cssx', 'packages/compiler', 'packages/unplugin']),
  );
  expect(dependencyFields).toContain('peerDependencies');
  expect(approvedDependencies.has('@cssxio/compiler')).toBe(true);
  expect(workspaceRoot).toContain('cssx');
});
