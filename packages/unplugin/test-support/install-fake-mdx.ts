import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/** Creates a tiny project-local MDX compiler so source tests need no example install. */
export async function installFakeMdxCompiler(projectRoot: string, compiledSource?: string): Promise<void> {
  const compilerDirectory = join(projectRoot, 'node_modules', '@mdx-js', 'mdx');
  await mkdir(compilerDirectory, { recursive: true });
  await writeFile(
    join(compilerDirectory, 'package.json'),
    JSON.stringify({ name: '@mdx-js/mdx', type: 'module', exports: './index.js' }),
  );
  await writeFile(
    join(compilerDirectory, 'index.js'),
    `export async function compile(source, { remarkPlugins = [] } = {}) {
      const tree = { children: [{ type: 'paragraph', children: [{ type: 'text', value: source }] }] };
      for (const entry of remarkPlugins) {
        const [plugin, options] = Array.isArray(entry) ? entry : [entry, undefined];
        const transform = plugin(options);
        await transform?.(tree);
      }
      return ${compiledSource === undefined ? "tree.children.flatMap((node) => node.children ?? []).map((node) => node.value).join('\\n')" : JSON.stringify(compiledSource)};
    }\n`,
  );
}
