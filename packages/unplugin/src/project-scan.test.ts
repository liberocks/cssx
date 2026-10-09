import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { scanProjectCssxSourceModules } from '../src/project-scan';
import { compileCssxStylesheet } from '../src/stylesheet';
import { installFakeMdxCompiler } from '../test-support/install-fake-mdx';

describe('project source scanning', () => {
  it('emits source-addressed aliases for every CSSX module in the project', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cssx-project-scan-'));
    try {
      await mkdir(join(root, 'src'), { recursive: true });
      await writeFile(
        join(root, 'src', 'server-component.tsx'),
        'import { sx } from "@cssxio/cssx"; export const className = sx("min-h-screen bg-white");',
      );
      const modules = await scanProjectCssxSourceModules(root, { stableClassNames: true });
      const [module] = modules;
      expect(module).toBeDefined();

      const aliases = Object.keys(module!.composites ?? {});
      expect(aliases).toHaveLength(1);
      const stylesheet = await compileCssxStylesheet(modules, undefined, undefined, false);
      expect(stylesheet.css).toContain(`.${aliases[0]!}`);
      expect(stylesheet.css).toContain('min-height:100vh');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('scans serial classes with manifest coordination and preserves the shared allocator snapshot', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cssx-project-scan-manifest-'));
    const manifestPath = join(root, '.cssx', 'classnames.json');
    try {
      await mkdir(join(root, 'src'), { recursive: true });
      await writeFile(
        join(root, 'src', 'server-component.tsx'),
        'import { sx } from "@cssxio/cssx"; export const className = sx("min-h-screen bg-white");',
      );
      await writeFile(join(root, 'AGENTS.md'), '# Instructions with ! punctuation');

      const modules = await scanProjectCssxSourceModules(root, {
        naming: 'serial',
        coordination: 'manifest',
        manifestPath,
      });
      const [module] = modules;
      expect(module).toBeDefined();
      expect(Object.keys(module!.composites ?? {})).toEqual(['s0x']);
      expect(await readFile(manifestPath, 'utf8')).toContain('s0x');
      const stylesheet = await compileCssxStylesheet(modules, undefined, undefined, false);
      expect(stylesheet.css).toContain('.s0x');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('ignores source files without CSSX imports, including MDX files', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cssx-project-scan-empty-'));
    try {
      await writeFile(join(root, 'plain.ts'), 'export const plain = true;');
      await writeFile(join(root, 'content.mdx'), '# Ordinary Markdown');
      await writeFile(join(root, 'content.md'), '# More ordinary Markdown');

      await expect(scanProjectCssxSourceModules(root, {})).resolves.toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('compiles MDX source that imports CSSX before scanning its styles', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cssx-project-scan-mdx-'));
    try {
      await installFakeMdxCompiler(
        root,
        `import { sx } from '@cssxio/cssx'; export default function MDXContent() { return <div className={sx('p-4')}>Styled</div>; }`,
      );
      await writeFile(
        join(root, 'content.mdx'),
        "import { sx } from '@cssxio/cssx';\n\n<div className={sx('p-4')}>Styled</div>",
      );

      const modules = await scanProjectCssxSourceModules(root, { naming: 'source' });

      expect(modules).toHaveLength(1);
      expect(modules[0]?.candidates).toHaveProperty('p-4');
      expect(Object.keys(modules[0]?.composites ?? {})).toHaveLength(1);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
