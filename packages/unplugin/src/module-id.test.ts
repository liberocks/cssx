import { expect, it } from 'vitest';
import { moduleId } from './module-id';

it('removes a module query string', () => {
  expect(moduleId('/source.ts?type=script')).toBe('/source.ts');
});
