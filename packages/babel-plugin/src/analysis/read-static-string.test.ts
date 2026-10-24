import { expect, it } from 'vitest';

import { inspectCalls } from './ast-test-paths';
import { readStaticString } from './read-static-string';

it('reads literals and immutable string constants but rejects dynamic expressions', () => {
  const values = inspectCalls(
    `const fixed = 'p-4'; let mutable = 'p-5'; mutable = 'p-6'; const computed = 'p-' + '7'; use('p-3'); use(fixed); use(mutable); use(computed); use(42);`,
    (path) => readStaticString(path.get('arguments.0')),
  );

  expect(values).toEqual(['p-3', 'p-4', null, null, null]);
});
