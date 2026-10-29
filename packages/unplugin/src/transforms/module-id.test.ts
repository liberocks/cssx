import { expect, it } from 'vitest';

import { moduleId } from './module-id';

it('removes a module query string', () => {
  expect(moduleId('/source.ts?type=script')).toBe('/source.ts');
});

it('normalizes Windows separators for consistent watcher and transform IDs', () => {
  expect(moduleId('C:\\workspace\\source.ts?import')).toBe('C:/workspace/source.ts');
});
