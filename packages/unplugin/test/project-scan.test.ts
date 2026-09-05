import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { scanProjectCssxSourceModules } from '../src/project-scan';
import { compileCssxStylesheet } from '../src/stylesheet';

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

  it('ignores generated trees and non-CSSX files', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cssx-project-scan-'));
    try {
      await mkdir(join(root, 'src'), { recursive: true });
      await mkdir(join(root, 'node_modules', 'dependency'), { recursive: true });
      await writeFile(join(root, 'src', 'plain.ts'), 'export const value = 1;');
      await writeFile(join(root, 'src', 'notes.txt'), 'not a module');
      await writeFile(
        join(root, 'node_modules', 'dependency', 'hidden.ts'),
        'import { sx } from "@cssxio/cssx"; export const className = sx("text-red-500");',
      );
      await symlink(join(root, 'src', 'plain.ts'), join(root, 'src', 'plain-link.ts'));

      await expect(scanProjectCssxSourceModules(root, { stableClassNames: true })).resolves.toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
