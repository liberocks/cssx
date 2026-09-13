import { expect, it } from 'vitest';
import { nativeBuildStateKey } from './native-build-state-key';

it('creates a stable, root-scoped native state key', () => {
  expect(nativeBuildStateKey('/project', { cssFileName: 'styles.css' })).toBe(
    '/project\u0000{"cssFileName":"styles.css"}',
  );
});
