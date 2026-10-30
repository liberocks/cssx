import { compileStyleMap, serializeCss } from '@cssxio/compiler';
import { describe, expect, it } from 'vitest';

import { formatSource } from '../../src/format-source';

describe('CSSX formatter integration', () => {
  it('preserves compiled CSS semantics while canonicalizing independent utilities', async () => {
    const utilities = 'hover:bg-blue-700 max-w-sm p-4 px-2 w-full rounded-xl bg-white p-2';
    const formatted = formatSource(`import { sx } from '@cssxio/cssx'; const className = sx("${utilities}");`, {
      filename: 'fixture.tsx',
    });
    expect(formatted.changed).toBe(true);
    const before = await compileStyleMap({ root: utilities });
    const after = await compileStyleMap({ root: formatted.code.match(/sx\("([^"]+)"\)/)?.[1] ?? '' });
    expect(serializeCss(after.rules)).toBe(serializeCss(before.rules));
  });

  it('preserves the source order of directional conflicts', () => {
    const source = `import { sx } from '@cssxio/cssx'; sx("px-2   p-4");`;
    expect(formatSource(source, { filename: 'fixture.tsx' }).code).toContain('sx("px-2 p-4")');
  });
});
