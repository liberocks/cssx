import { expect, it } from 'vitest';

import { unescapeUnderscores } from './unescape-underscores';

it('decodes only explicit underscore escapes', () => {
  expect(unescapeUnderscores('name\\_part other_name')).toBe('name_part other_name');
});
