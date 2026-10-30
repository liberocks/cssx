import { beforeEach, describe, expect, it, vi } from 'vitest';

import { formatSource } from '../../src/format-source';

const nativeCalls = vi.hoisted(() => ({ find: vi.fn() }));

vi.mock('../../src/load-native-formatter', () => ({
  loadNativeFormatter: () => ({ findCssxFormattingLiterals: nativeCalls.find }),
}));

describe('formatSource native dispatch', () => {
  beforeEach(() => {
    nativeCalls.find.mockReset();
  });

  it('uses the native analyzer and applies its source ranges', () => {
    const source = `import { sx } from '@cssxio/cssx'; sx("bg-white   p-4", "rounded-xl   p-2");`;
    const firstStart = source.indexOf('"bg-white   p-4"');
    const secondStart = source.indexOf('"rounded-xl   p-2"');
    nativeCalls.find.mockReturnValue([
      { start: firstStart, end: firstStart + '"bg-white   p-4"'.length, value: 'bg-white   p-4' },
      {
        start: secondStart,
        end: secondStart + '"rounded-xl   p-2"'.length,
        value: 'rounded-xl   p-2',
      },
    ]);

    expect(formatSource(source, { filename: 'example.tsx' })).toEqual({
      code: `import { sx } from '@cssxio/cssx'; sx("p-4 bg-white", "p-2 rounded-xl");`,
      changed: true,
      diagnostics: [],
    });
    expect(nativeCalls.find).toHaveBeenCalledWith(source, 'example.tsx', '@cssxio/cssx');
  });
});
