import { describe, expect, it } from 'vitest';

import { compileCssxStylesheet } from './compile-cssx-stylesheet';

describe('compileCssxStylesheet', () => {
  it('merges source modules deterministically and creates origin mappings', async () => {
    const stylesheet = await compileCssxStylesheet(
      [
        {
          id: '/z.ts',
          candidates: { 'p-4': 'padding', 'text-red-500': 'color' },
          origins: { 'p-4': { line: 1, column: 4 } },
        },
        {
          id: '/a.ts',
          candidates: { 'p-4': 'ignored', 'bg-blue-500': 'background' },
          origins: { 'p-4': { line: 9, column: 9 }, 'bg-blue-500': { line: 3, column: 2 } },
          composites: { composite: ['padding', 'color'] },
        },
      ],
      undefined,
      'app',
    );

    expect(stylesheet.css).toContain('.ignored{');
    expect(stylesheet.css).toContain('.color,.composite{');
    expect(stylesheet.css).toContain('.background{');
    expect(stylesheet.css).toMatch(/^@layer app\{/);
    expect(stylesheet.map?.sources).toEqual(['/a.ts', '/z.ts']);
    expect(stylesheet.map?.mappings).not.toBe('');
  });

  it('handles empty output, optional layers, and disabled preflight', async () => {
    const defaults = await compileCssxStylesheet([]);
    const layered = await compileCssxStylesheet([], undefined, 'app');
    const noPreflight = await compileCssxStylesheet([], undefined, 'app', true, undefined, false);

    expect(defaults.css).toContain('body{margin:0;line-height:inherit}');
    expect(layered.css).toMatch(/^@layer app\{/);
    expect(noPreflight.css).toBe('');
  });

  it('omits source maps when disabled or source locations are unavailable', async () => {
    const noMap = await compileCssxStylesheet(
      [{ id: '/app.ts', candidates: { 'p-4': 'padding' } }],
      undefined,
      undefined,
      false,
    );
    const missingOrigin = await compileCssxStylesheet([{ id: '', candidates: { 'p-4': 'padding' } }]);

    expect(noMap.css).toContain('.padding{');
    expect(noMap.map).toBeUndefined();
    expect(missingOrigin.map).toBeUndefined();
  });

  it('aggregates proven precompiled modules without invoking the utility compiler', async () => {
    const stylesheet = await compileCssxStylesheet(
      [
        {
          id: '/page.tsx',
          candidates: { '[display:flex]': 's0x' },
          composites: {},
          precompiledCss: '.s0x{display:flex;}',
        },
      ],
      undefined,
      'app',
      false,
    );

    expect(stylesheet.css).toMatch(/^@layer app\{/);
    expect(stylesheet.css).toContain('.s0x{display:flex;}');
    expect(stylesheet.css.match(/@layer app\{/g)).toHaveLength(1);
    expect(stylesheet.map).toBeUndefined();
  });

  it('rejects conflicting composite aliases', async () => {
    await expect(
      compileCssxStylesheet([
        { id: 'one.ts', candidates: {}, composites: { shared: ['one'] } },
        { id: 'two.ts', candidates: {}, composites: { shared: ['two'] } },
      ]),
    ).rejects.toThrow('CSSX composite class collision');
  });

  it('keeps composite-only modules out of the precompiled empty path', async () => {
    const stylesheet = await compileCssxStylesheet(
      [{ id: '/composite.ts', candidates: {}, composites: { alias: ['s0x'] }, atomicClasses: ['s0x'] }],
      undefined,
      undefined,
      false,
      undefined,
      false,
    );

    expect(stylesheet.css).toBe('');
  });

  it('uses the precompiled path for a single empty source module', async () => {
    const stylesheet = await compileCssxStylesheet(
      [{ id: '/empty.ts', candidates: {} }],
      undefined,
      undefined,
      false,
      undefined,
      false,
    );

    expect(stylesheet.css).toBe('');
  });

  it('uses provided atomic class metadata during stylesheet compilation', async () => {
    const stylesheet = await compileCssxStylesheet(
      [{ id: '/atomic.ts', candidates: { 'p-4': 's0x' }, atomicClasses: ['s0x'] }],
      undefined,
      undefined,
      false,
      undefined,
      false,
    );

    expect(stylesheet.css).toContain('.s0x{');
  });
});
