import { parseSync } from 'oxc-parser';
import { describe, expect, it } from 'vitest';

import { formatSource, formatSourceInternals } from '../../src/format-source';
import * as formatter from '../../src/index';
import type { NativeCssxFormatter } from '../../src/load-native-formatter';

const options = { filename: 'example.tsx' };

describe('formatSource', () => {
  it('exports both supported formatter APIs', () => {
    expect(formatter.formatUtilityList('bg-white p-4')).toBe('p-4 bg-white');
    expect(formatter.formatSource(`import { sx } from '@cssxio/cssx'; sx("bg-white   p-4");`, options).changed).toBe(
      true,
    );
  });

  it('formats imported sx calls without changing surrounding JSX', () => {
    const source = `import { sx } from '@cssxio/cssx';\n<section className={sx("w-full max-w-sm rounded-xl   bg-white p-7")}>ok</section>;\n`;
    const result = formatSource(source, options);
    expect(result).toEqual({
      code: `import { sx } from '@cssxio/cssx';\n<section className={sx("w-full max-w-sm p-7 rounded-xl bg-white")}>ok</section>;\n`,
      changed: true,
      diagnostics: [],
    });
  });

  it('recognizes aliases, namespace imports, props calls, arrays, and condition branches', () => {
    const source = `import { sx as styles, props } from '@cssxio/cssx';\nimport * as cssx from '@cssxio/cssx';\nstyles([flag ? "bg-white   p-4" : "text-sm   rounded-md", flag && "hover:bg-black   p-2"]);\nprops(flag ? "bg-white   p-4" : "text-sm   rounded-md");\ncssx.sx("bg-red-500   p-2");`;
    const result = formatSource(source, options);
    expect(result.code).toContain('"p-4 bg-white"');
    expect(result.code).toContain('"text-sm rounded-md"');
    expect(result.code).toContain('"p-2 hover:bg-black"');
    expect(result.code).toContain('cssx.sx("p-2 bg-red-500")');
  });

  it('formats literal utilities on both sides of logical expressions', () => {
    const source = `import { sx } from '@cssxio/cssx'; sx("bg-white   p-4" || flag && "text-sm   rounded-md");`;
    const result = formatSource(source, options);
    expect(result.code).toContain('sx("p-4 bg-white" || flag && "text-sm rounded-md")');
  });

  it('formats static create values and templates while leaving references and interpolations unchanged', () => {
    const source =
      `import { create, sx } from '@cssxio/cssx';\nconst shared = "bg-white   p-4";\nconst styles = create({ card: "bg-white   p-4", shared, other: \`bg-white   p-4\` });\nsx(\`bg-white   p-4\`, \`p-2 ` +
      '${' +
      'dynamic}`);';
    const result = formatSource(source, options);
    expect(result.code).toContain('card: "p-4 bg-white"');
    expect(result.code).toContain('const shared = "bg-white   p-4"');
    expect(result.code).toContain('other: `p-4 bg-white`');
    expect(result.code).toContain('sx(`p-4 bg-white`, `p-2 ${dynamic}`);');
  });

  it('respects shadowed calls and leaves unrelated strings and comments unchanged', () => {
    const source = `import { sx as styles } from '@cssxio/cssx';\nconst note = "bg-white   p-4";\nstyles("bg-white   p-4");\nfunction local(styles: (x: string) => string) { return styles("bg-white   p-4"); }\n// styles("bg-white   p-4")`;
    const result = formatSource(source, options);
    expect(result.code).toContain('const note = "bg-white   p-4"');
    expect(result.code).toContain('styles("p-4 bg-white")');
    expect(result.code).toContain('return styles("bg-white   p-4")');
    expect(result.code).toContain('// styles("bg-white   p-4")');
  });

  it('resolves lexical shadows in functions, blocks, loops, catch clauses, and switch cases', () => {
    const source = `import { sx } from '@cssxio/cssx';\nsx("bg-white   p-4");\n{ const sx = local; sx("bg-white   p-4"); class sxClass {} }\nfunction parameter(sx: unknown) { sx("bg-white   p-4"); }\nfunction object({ sx }: { sx: unknown }) { sx("bg-white   p-4"); }\nfunction array([sx]: unknown[]) { sx("bg-white   p-4"); }\nfunction rest(...sx: unknown[]) { sx("bg-white   p-4"); }\nfunction defaults(sx = local) { sx("bg-white   p-4"); }\nfunction variable() { if (true) { var sx = local; } sx("bg-white   p-4"); }\nconst arrow = (sx: unknown) => sx("bg-white   p-4");\nconst expression = function (sx: unknown) { sx("bg-white   p-4"); };\ntry { throw 1; } catch (sx) { sx("bg-white   p-4"); }\nfor (let sx = 0; sx < 1; sx += 1) sx("bg-white   p-4");\nfor (const sx of values) sx("bg-white   p-4");\nfor (const sx in values) sx("bg-white   p-4");\nswitch (value) { case 1: const sx = local; sx("bg-white   p-4"); }`;
    const result = formatSource(source, options);
    expect(result.code.match(/p-4 bg-white/g)).toHaveLength(1);
    expect(result.code).toContain('function defaults(sx = local) { sx("bg-white   p-4"); }');
  });

  it('recognizes namespace members and ignores computed, unrelated, and default-import members', () => {
    const source = `import * as cssx from '@cssxio/cssx';\nimport runtime from '@cssxio/cssx';\ncssx.sx("bg-white   p-4");\ncssx["sx"]("bg-white   p-4");\ncssx.other("bg-white   p-4");\nruntime.sx("bg-white   p-4");\nthis.sx("bg-white   p-4");`;
    const result = formatSource(source, options);
    expect(result.code.match(/p-4 bg-white/g)).toHaveLength(1);
    expect(result.code).toContain('cssx["sx"]("bg-white   p-4")');
  });

  it('keeps source offsets correct after Unicode and preserves JS escapes', () => {
    const source = `const label = "🦊"; import { sx } from '@cssxio/cssx'; sx('bg-white p-4 [content:var(--label\\\\:wide)]');`;
    const result = formatSource(source, options);
    expect(result.code).toContain("sx('p-4 bg-white [content:var(--label\\\\:wide)]')");
  });

  it('is idempotent and leaves unsupported extensions unchanged', () => {
    const source = `import { sx } from '@cssxio/cssx'; sx("bg-white   p-4");`;
    const formatted = formatSource(source, options);
    expect(formatSource(formatted.code, options)).toMatchObject({ code: formatted.code, changed: false });
    expect(formatSource(source, { filename: 'styles.css' })).toEqual({ code: source, changed: false, diagnostics: [] });
  });

  it('reports parser errors without rewriting source', () => {
    const source = `import { sx } from '@cssxio/cssx'; sx("bg-white   p-4";`;
    expect(formatSource(source, options)).toMatchObject({
      code: source,
      changed: false,
      diagnostics: expect.any(Array),
    });
  });

  it('skips parsing unrelated source and still detects escaped CSSX module specifiers', () => {
    const unrelated = 'const broken = ;';
    expect(formatSource(unrelated, options)).toEqual({ code: unrelated, changed: false, diagnostics: [] });

    const escapedImport = String.raw`import { sx } from '\x40cssxio/cssx'; sx("bg-white p-4");`;
    expect(formatSource(escapedImport, options).code).toContain('sx("p-4 bg-white")');
  });

  it('uses a configured package source for import recognition', () => {
    const source = `import { sx } from 'custom-cssx'; sx("bg-white   p-4");`;
    expect(formatSource(source, { ...options, importSource: 'custom-cssx' }).code).toContain('sx("p-4 bg-white")');
    expect(formatSource(source, options).changed).toBe(false);
  });

  it('formats literals returned by the native source analyzer without invoking the JS parser', () => {
    const source = `import { sx } from '@cssxio/cssx'; sx("bg-white   p-4");`;
    const start = source.indexOf('"bg-white   p-4"');
    const nativeFormatter: NativeCssxFormatter = {
      findCssxFormattingLiterals: () => [{ start, end: start + '"bg-white   p-4"'.length, value: 'bg-white   p-4' }],
    };

    expect(formatSourceInternals.formatSourceWithNativeFormatter(source, options, nativeFormatter)).toEqual({
      code: `import { sx } from '@cssxio/cssx'; sx("p-4 bg-white");`,
      changed: true,
      diagnostics: [],
    });
  });

  it('falls back to the JavaScript parser when native parsing fails or returns invalid ranges', () => {
    const source = `import { sx } from '@cssxio/cssx'; sx("bg-white   p-4");`;
    const throwingFormatter: NativeCssxFormatter = {
      findCssxFormattingLiterals: () => {
        throw new Error('native parse error');
      },
    };
    const invalidRangeFormatter: NativeCssxFormatter = {
      findCssxFormattingLiterals: () => [{ start: 0, end: source.length + 1, value: 'bg-white p-4' }],
    };

    expect(formatSourceInternals.formatSourceWithNativeFormatter(source, options, undefined)).toBeUndefined();
    expect(formatSourceInternals.formatSourceWithNativeFormatter(source, options, throwingFormatter)).toBeUndefined();
    expect(
      formatSourceInternals.formatSourceWithNativeFormatter(source, options, invalidRangeFormatter),
    ).toBeUndefined();
    expect(formatSource(source, options).code).toContain('sx("p-4 bg-white")');
    expect(formatSourceInternals.formatSourceWithParser(source, { filename: 'example.css' }, parseSync)).toEqual({
      code: source,
      changed: false,
      diagnostics: [],
    });
  });

  it('handles native source ranges for every quote form and rejects invalid ranges', () => {
    for (const quote of ['"', "'", '`']) {
      const source = `${quote}bg-white p-4${quote}`;
      expect(
        formatSourceInternals.formatSourceWithLiterals(source, [
          { start: 0, end: source.length, value: 'bg-white p-4' },
        ]),
      ).toEqual({ code: `${quote}p-4 bg-white${quote}`, changed: true, diagnostics: [] });
    }
    expect(
      formatSourceInternals.formatSourceWithLiterals('"p-4 bg-white"', [
        { start: 0, end: '"p-4 bg-white"'.length, value: 'p-4 bg-white' },
      ]),
    ).toEqual({ code: '"p-4 bg-white"', changed: false, diagnostics: [] });

    const source = 'bg-white p-4';
    for (const range of [
      { start: Number.NaN, end: 2, value: 'p-4 bg-white' },
      { start: 0, end: Number.NaN, value: 'p-4 bg-white' },
      { start: -1, end: 2, value: 'p-4 bg-white' },
      { start: 2, end: 2, value: 'p-4 bg-white' },
      { start: 0, end: source.length + 1, value: 'p-4 bg-white' },
    ]) {
      expect(() => formatSourceInternals.formatSourceWithLiterals(source, [range])).toThrow('invalid source range');
    }
    expect(() =>
      formatSourceInternals.formatSourceWithLiterals(source, [{ start: 0, end: source.length, value: 'p-4 bg-white' }]),
    ).toThrow('outside a string literal');
  });

  it('detects escaped import sources through comments and ignores ordinary from tokens', () => {
    const isEscaped = formatSourceInternals.hasEscapedFromSpecifier;
    expect(isEscaped(String.raw`import { sx } from '\x40cssxio/cssx';`)).toBe(true);
    expect(isEscaped(String.raw`import { sx } from /* comment */ '\x40cssxio/cssx';`)).toBe(true);
    expect(
      isEscaped(String.raw`import { sx } from
      // comment
      '\x40cssxio/cssx';`),
    ).toBe(true);
    expect(isEscaped('import { sx } from // comment without a newline')).toBe(false);
    expect(isEscaped('import { sx } from /* comment without a close')).toBe(false);
    expect(isEscaped(`import { sx } from '@cssxio/cssx';`)).toBe(false);
    expect(isEscaped('const fromage = "other"; from')).toBe(false);
    expect(isEscaped('from')).toBe(false);
  });
});
