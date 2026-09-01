import { describe, expect, it } from 'vitest';
import { serializeCss } from '@cssxio/compiler';
import { compileCssxStylesheet, transformCssxModule } from '../src/index';
import { sourceMapFromContext } from '../src/transform';
import { decodeFirstMapping, pluginFor, source, transformRequired } from './transform-helpers';

describe('CSSX unplugin transform', () => {
  it('returns transformed code and standalone CSS metadata', async () => {
    const result = await transformCssxModule(source, '/project/styles.ts');

    expect(result?.code).not.toContain('@cssxio/cssx');
    expect(serializeCss(result?.rules ?? [])).toContain('padding:calc(0.25rem * 5)');
    expect(result?.map?.sources).toEqual(['styles.ts']);
  });

  it('composes an incoming JavaScript source map through the CSSX transform', async () => {
    const result = await transformRequired(
      source,
      '/project/generated.ts',
      {},
      {
        version: 3,
        file: 'generated.ts',
        sources: ['original.ts'],
        names: [],
        sourcesContent: [source],
        mappings: 'AAAA',
      },
    );
    expect(result.map?.sources).toEqual(['original.ts']);
  });

  it('accepts only complete incoming source maps from bundler contexts', () => {
    expect(sourceMapFromContext(undefined, '/project/input.ts')).toBeUndefined();
    expect(sourceMapFromContext({}, '/project/input.ts')).toBeUndefined();
    expect(sourceMapFromContext({ getCombinedSourcemap: () => ({ version: 2 }) }, '/project/input.ts')).toBeUndefined();
    expect(
      sourceMapFromContext(
        {
          getCombinedSourcemap: () => ({
            version: 3,
            sources: ['original.ts'],
            names: ['value'],
            mappings: 'AAAA',
            sourceRoot: '/source',
            sourcesContent: [source],
          }),
        },
        '/project/input.ts',
      ),
    ).toMatchObject({ file: '/project/input.ts', sourceRoot: '/source', names: ['value'] });
    expect(sourceMapFromContext({ getCombinedSourcemap: () => null }, '/project/input.ts')).toBeUndefined();
    expect(
      sourceMapFromContext(
        { getCombinedSourcemap: () => ({ version: 3, sources: [], mappings: '' }) },
        '/project/input.ts',
      ),
    ).toMatchObject({ names: [], file: '/project/input.ts' });
  });

  it('retains an empty CSSX metadata record when an import has no utility literals', async () => {
    const result = await transformRequired(
      "import * as cssx from '@cssxio/cssx'; export const value = cssx;",
      '/project/empty.ts',
    );

    expect(result.rules).toEqual([]);
    expect(result.candidates).toEqual({});
  });

  it('maps final utility fragments to their originating modules', async () => {
    const stylesheet = await compileCssxStylesheet([
      { id: '/project/button.ts', candidates: { 'p-4': 'cssx-padding' } },
      { id: '/project/title.ts', candidates: { 'text-white': 'cssx-color' } },
    ]);

    expect(stylesheet.css).toContain('.cssx-padding');
    expect(stylesheet.css).toContain('.cssx-color');
    expect(stylesheet.map?.sources).toEqual(['/project/button.ts', '/project/title.ts']);
    expect(stylesheet.map?.mappings).not.toBe('');
  });

  it('maps only candidates with available source locations', async () => {
    const stylesheet = await compileCssxStylesheet([
      { id: '', candidates: { 'p-4': 'cssx-padding' } },
      { id: '/project/title.ts', candidates: { 'text-white': 'cssx-color' } },
    ]);

    expect(stylesheet.map?.sources).toEqual(['/project/title.ts']);
    expect(stylesheet.map?.mappings).not.toBe('');
  });

  it('can compile a stylesheet without a CSS source map', async () => {
    const stylesheet = await compileCssxStylesheet(
      [{ id: '/project/button.ts', candidates: { 'p-4': 'cssx-padding' } }],
      undefined,
      undefined,
      false,
    );

    expect(stylesheet.css).toContain('.cssx-padding');
    expect(stylesheet.map).toBeUndefined();
  });

  it('retains candidate source locations in final CSS mappings', async () => {
    const transformed = await transformRequired(
      "import * as cssx from '@cssxio/cssx';\nexport const styles = cssx.create({ root: 'p-4' });",
      '/project/located.ts',
    );
    expect(transformed.origins['p-4']).toEqual({ line: 1, column: 22 });

    const stylesheet = await compileCssxStylesheet([
      { id: '/project/located.ts', candidates: transformed.candidates, origins: transformed.origins },
    ]);
    expect(decodeFirstMapping(stylesheet.map?.mappings ?? '')).toEqual([0, 0, 1, 22]);
  });

  it('extracts static sx literals while retaining dynamic conditional class joining', async () => {
    const result = await transformRequired(
      `import { sx } from '@cssxio/cssx'; export const className = sx('p-4', disabled && 'opacity-50');`,
      '/project/inline.ts',
    );
    const css = serializeCss(result.rules);

    expect(result.code).toContain('sx("');
    expect(result.code).toContain('disabled && "');
    expect(css).toContain('padding:calc(0.25rem * 4)');
    expect(css).toContain('opacity:0.5');
  });

  it('extracts sx calls directly from Astro templates', async () => {
    const result = await transformRequired(
      `---\nimport { sx } from '@cssxio/cssx';\n---\n<main class={sx('p-4', disabled && 'opacity-50')} />`,
      '/project/page.astro',
    );
    const css = serializeCss(result.rules);

    expect(result.code).toContain('class={sx("');
    expect(result.code).toContain('disabled && "');
    expect(css).toContain('padding:calc(0.25rem * 4)');
    expect(css).toContain('opacity:0.5');
  });

  it('folds static props without a runtime import and emits only its hashed rules', async () => {
    const result = await transformRequired(
      `import * as cssx from '@cssxio/cssx'; const styles = cssx.create({ root: 'p-5 bg-red-500' }); export const rootProps = cssx.props(styles.root);`,
      '/project/static.ts',
    );
    const css = serializeCss(result.rules);
    const classNames = [...result.code.matchAll(/className: "([^"]+)"/g)].flatMap(
      (match) => match[1]?.split(' ') ?? [],
    );

    expect(result.code).not.toMatch(/from\s+['"]@cssxio\/cssx['"]/);
    expect(result.rules).toHaveLength(1);
    expect(classNames).toHaveLength(1);
    expect(css).toContain(`.${classNames[0]}`);
    expect(result.atomicClasses).toEqual([]);
    expect(
      Object.values(result.candidates)
        .flatMap((className) => className.split(' '))
        .every((className) => !css.includes(`.${className}`)),
    ).toBe(true);
    expect(css).not.toContain('p-5');
    expect(css).not.toContain('bg-red-500');
  });

  it('extracts variant and arbitrary-property candidates through the CSSX compiler', async () => {
    const result = await transformRequired(
      `import * as cssx from '@cssxio/cssx'; export const styles = cssx.create({ root: 'sm:hover:bg-red-500 [mask-type:luminance]' });`,
      '/project/variants.ts',
    );
    const css = serializeCss(result.rules);

    expect(css).toContain('mask-type:luminance');
    expect(css).toContain('@media (width >= 40rem)');
    expect(css).toContain('@media (hover: hover)');
    expect(css).not.toContain('sm\\:hover\\:bg-red-500');
  });

  it('keeps hashes and CSS ordering stable across repeated and reordered module transforms', async () => {
    const modules = [
      [
        `import * as cssx from '@cssxio/cssx'; export const first = cssx.create({ root: 'p-5 hover:bg-red-500' });`,
        '/project/first.ts',
      ],
      [
        `import * as cssx from '@cssxio/cssx'; export const second = cssx.create({ root: 'text-white gap-2' });`,
        '/project/second.ts',
      ],
    ] as const;
    const forward = await Promise.all(modules.map(([code, id]) => transformRequired(code, id)));
    const reverse = await Promise.all([...modules].reverse().map(([code, id]) => transformRequired(code, id)));
    const repeat = await Promise.all(modules.map(([code, id]) => transformRequired(code, id)));

    expect(serializeCss(forward.flatMap((result) => result.rules))).toBe(
      serializeCss(reverse.flatMap((result) => result.rules)),
    );
    expect(serializeCss(forward.flatMap((result) => result.rules))).toBe(
      serializeCss(repeat.flatMap((result) => result.rules)),
    );
  });

  it('emits Vite and Rollup CSS from the final module graph, including cached metadata', async () => {
    const plugin = pluginFor('vite');
    const transformed = await plugin.transform.handler(source, '/project/styles.ts');
    const additional = await plugin.transform.handler(
      `import * as cssx from '@cssxio/cssx'; export const styles = cssx.create({ root: 'text-white' });`,
      '/project/additional.ts',
    );
    const emitted: any[] = [];
    const context = {
      emitFile(asset: unknown) {
        emitted.push(asset);
      },
      getModuleInfo(id: string) {
        if (id === '/project/styles.ts') {
          return { meta: transformed.meta };
        }
        if (id === '/project/additional.ts') {
          return { meta: additional.meta };
        }
        return null;
      },
    };
    const bundle = {
      'entry.js': { type: 'chunk', modules: { '/project/styles.ts': {}, '/project/additional.ts': {} } },
    };

    await plugin.rollup.generateBundle.call(context, {}, bundle);
    await plugin.rollup.generateBundle.call(context, {}, bundle);

    expect(emitted).toHaveLength(4);
    expect(emitted[0]).toMatchObject({ type: 'asset', fileName: 'cssx.css' });
    expect(emitted[0].source).toContain('padding:calc(0.25rem * 5)');
    expect(emitted[0].source.match(/padding:calc\(0\.25rem \* 5\)/g)).toHaveLength(1);
    expect(emitted[0].source).not.toContain(':root');
    expect(emitted[1]).toMatchObject({ type: 'asset', fileName: 'cssx.css.map' });
    expect(JSON.parse(emitted[1].source).sources).toEqual(['/project/additional.ts', '/project/styles.ts']);
  });

  it('retains transformed CSSX candidates when Vite does not retain plugin metadata', async () => {
    const plugin = pluginFor('vite');
    await plugin.transform.handler(source, '/project/styles.ts?astro&type=script');
    const emitted: any[] = [];

    await plugin.vite.generateBundle.call(
      {
        emitFile(asset: unknown) {
          emitted.push(asset);
        },
        getModuleInfo() {
          return { meta: {} };
        },
      },
      {},
      { 'entry.js': { type: 'chunk', modules: {} } },
    );

    expect(emitted).toHaveLength(2);
    expect(emitted[0].source).toContain('padding:calc(0.25rem * 5)');
    expect(emitted[1]).toMatchObject({ fileName: 'cssx.css.map' });
  });

  it('removes Vite candidates when a watched source file is deleted', async () => {
    const plugin = pluginFor('vite');
    await plugin.transform.handler(source, '/project/styles.ts');
    plugin.watchChange('/project/styles.ts', { event: 'delete' });
    const emitted: unknown[] = [];

    await plugin.vite.generateBundle.call(
      {
        emitFile(asset: unknown) {
          emitted.push(asset);
        },
        getModuleInfo() {
          return null;
        },
      },
      {},
      { 'entry.js': { type: 'chunk', modules: {} } },
    );

    expect(emitted).toEqual([]);
  });

  it('serves a virtual Vite stylesheet and refreshes it after module transforms', async () => {
    const plugin = pluginFor('vite');
    let middleware: ((request: any, response: any, next: () => void) => void) | undefined;
    const messages: any[] = [];
    plugin.vite.configureServer({
      config: { base: '/' },
      middlewares: {
        use(handler: typeof middleware) {
          middleware = handler;
        },
      },
      ws: {
        send(message: unknown) {
          messages.push(message);
        },
      },
    });

    await plugin.transform.handler(source, '/project/styles.ts');
    const response: { headers: Record<string, string>; body?: string } = { headers: {} };
    await new Promise<void>((resolvePromise) =>
      middleware?.(
        { url: '/cssx.css?direct' },
        {
          setHeader(name: string, value: string) {
            response.headers[name] = value;
          },
          end(body?: string) {
            response.body = body;
            resolvePromise();
          },
        },
        resolvePromise,
      ),
    );

    expect(response.headers['Content-Type']).toContain('text/css');
    expect(response.headers['Cache-Control']).toBe('no-store');
    expect(response.body).toContain('padding:calc(0.25rem * 5)');
    expect(messages).toContainEqual(
      expect.objectContaining({
        type: 'update',
        updates: [expect.objectContaining({ type: 'css-update', path: '/cssx.css', acceptedPath: '/cssx.css' })],
      }),
    );
  });

  it('uses default serial names in Vite development', async () => {
    const plugin = pluginFor('vite');
    plugin.vite.configureServer({
      config: { base: '/' },
      middlewares: { use() {} },
      ws: { send() {} },
    });

    const transformed = await plugin.transform.handler(
      `import * as cssx from '@cssxio/cssx'; const styles = cssx.create({ root: 'p-4' }); export const props = cssx.props(styles.root);`,
      '/project/styles.ts',
    );

    expect(transformed.code).toMatch(/className: "s[0-9A-Za-z]+x"/);
    expect(transformed.code).not.toContain('className: "d');
  });
});
