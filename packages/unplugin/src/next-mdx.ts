import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/** Serializable MDX plugin configuration accepted by the Next.js helper. */
export type CssxNextMdxPlugin = string | readonly [string, Readonly<Record<string, unknown>>];

/** Safe MDX compiler options that can cross a Turbopack loader boundary. */
export interface CssxNextMdxOptions {
  readonly remarkPlugins?: readonly CssxNextMdxPlugin[];
  readonly rehypePlugins?: readonly CssxNextMdxPlugin[];
  readonly recmaPlugins?: readonly CssxNextMdxPlugin[];
  readonly development?: boolean;
}

/** Compiles MDX source with the project's installed MDX compiler and plugins. */
export async function compileNextMdx(source: string, root: string, options: CssxNextMdxOptions = {}): Promise<string> {
  const require = createRequire(resolve(root, 'package.json'));
  let compilerPath: string;
  try {
    compilerPath = require.resolve('@mdx-js/mdx');
  } catch {
    throw new Error('CSSX Next MDX support requires @mdx-js/mdx to be installed in the Next.js project.');
  }
  const compiler = (await import(pathToFileURL(compilerPath).href)) as {
    compile(value: string, settings: Record<string, unknown>): Promise<string>;
  };
  const resolvePlugins = async (plugins: readonly CssxNextMdxPlugin[] | undefined) =>
    Promise.all(
      (plugins ?? []).map(async (plugin) => {
        const [name, pluginOptions] = typeof plugin === 'string' ? [plugin, undefined] : plugin;
        const path = require.resolve(name);
        const loaded = (await import(pathToFileURL(path).href)) as { default?: unknown };
        const handler = loaded.default ?? loaded;
        return pluginOptions === undefined ? handler : [handler, pluginOptions];
      }),
    );
  return String(
    await compiler.compile(source, {
      outputFormat: 'program',
      development: options.development ?? false,
      remarkPlugins: await resolvePlugins(options.remarkPlugins),
      rehypePlugins: await resolvePlugins(options.rehypePlugins),
      recmaPlugins: await resolvePlugins(options.recmaPlugins),
    }),
  );
}
