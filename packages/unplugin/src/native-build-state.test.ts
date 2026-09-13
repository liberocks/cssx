import { expect, it } from 'vitest';

import { nativeBuildState } from './native-build-state';

it('shares native state only between equivalent project options', () => {
  const first = nativeBuildState('/cssx-state-test', { cssFileName: 'styles.css' });
  const second = nativeBuildState('/cssx-state-test', { cssFileName: 'styles.css' });
  const different = nativeBuildState('/cssx-state-test', { cssFileName: 'other.css' });

  expect(second).toBe(first);
  expect(different).not.toBe(first);
});
