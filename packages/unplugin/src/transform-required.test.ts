import { expect, it } from 'vitest';

import { transformRequired } from './transform-required';
import { source } from './transform-test-source';

it('returns transformed CSSX modules and rejects unrelated sources', async () => {
  await expect(transformRequired(source, '/project/styles.ts')).resolves.toMatchObject({
    code: expect.stringContaining('$$css'),
  });
  await expect(transformRequired('export const value = 1;', '/project/plain.ts')).rejects.toThrow(
    'CSSX did not transform /project/plain.ts.',
  );
});
