import { compileStyleMap, serializeCss } from '@cssxio/compiler';
import { parseSync } from 'oxc-parser';
import { describe, expect, it } from 'vitest';

import { formatSource, formatSourceInternals } from '../../src/format-source';
import { loadNativeFormatter, nativeFormatterInternals } from '../../src/load-native-formatter';

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

  it.skipIf(!process.env.CSSX_TEST_NATIVE_COMPILER)('matches the TypeScript sorter through the native analyzer', () => {
    nativeFormatterInternals.reset();
    expect(loadNativeFormatter()).toBeDefined();
    const source =
      `import { sx as style, create, props } from '@cssxio/cssx';\nconst name = "🦊"; style([flag ? "bg-white   p-4" : ` +
      '`rounded-xl   text-sm`' +
      `, flag && "content-['hello  world']   bg-black"]);\nconst styles = create({ card: "p-4   p-2   bg-white" }); props(styles.card);`;
    const options = { filename: 'fixture.tsx' };
    const nativeResult = formatSource(source, options);
    const fallbackResult = formatSourceInternals.formatSourceWithParser(source, options, parseSync);

    expect(nativeResult).toEqual(fallbackResult);
    expect(nativeResult.code).toContain('hello  world');
    expect(nativeResult.code).toContain('p-4 p-2 bg-white');
  });
});
