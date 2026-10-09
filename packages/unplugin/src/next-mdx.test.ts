import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, it } from 'vitest';

import { compileNextMdx } from './next-mdx';

const projectRoot = resolve(import.meta.dirname, '../../../examples/next');

it('compiles MDX with string and option-bearing plugin entries', async () => {
  const pluginRoot = await mkdtemp(join(tmpdir(), 'cssx-mdx-plugin-'));
  const stringPluginPath = join(pluginRoot, 'append-string.mjs');
  const tuplePluginPath = join(pluginRoot, 'append-tuple.mjs');
  try {
    await writeFile(
      stringPluginPath,
      `export default function append() { return (tree) => { tree.children.push({ type: 'paragraph', children: [{ type: 'text', value: 'string-plugin' }] }); }; }`,
    );
    await writeFile(
      tuplePluginPath,
      `export default function append(options = {}) { return (tree) => { tree.children.push({ type: 'paragraph', children: [{ type: 'text', value: options.label }] }); }; }`,
    );
    const output = await compileNextMdx('# Title', projectRoot, {
      remarkPlugins: [stringPluginPath, [tuplePluginPath, { label: 'tuple-plugin' }]],
      development: true,
    });
    expect(output).toContain('Title');
    expect(output).toContain('string-plugin');
    expect(output).toContain('tuple-plugin');
  } finally {
    await rm(pluginRoot, { recursive: true, force: true });
  }
}, 30_000);

it('reports when the consuming project has no MDX compiler', async () => {
  const projectRootWithoutMdx = await mkdtemp(join(tmpdir(), 'cssx-mdx-missing-'));
  try {
    await writeFile(join(projectRootWithoutMdx, 'package.json'), '{}');
    await expect(compileNextMdx('# Title', projectRootWithoutMdx)).rejects.toThrow(
      'requires @mdx-js/mdx to be installed',
    );
  } finally {
    await rm(projectRootWithoutMdx, { recursive: true, force: true });
  }
});

it('rejects plugin modules that do not expose a default plugin function', async () => {
  const pluginRoot = await mkdtemp(join(tmpdir(), 'cssx-mdx-invalid-plugin-'));
  const pluginPath = join(pluginRoot, 'invalid.mjs');
  try {
    await writeFile(pluginPath, 'export const namedPlugin = () => {};');
    await expect(compileNextMdx('# Title', projectRoot, { remarkPlugins: [pluginPath] })).rejects.toThrow();
  } finally {
    await rm(pluginRoot, { recursive: true, force: true });
  }
});
