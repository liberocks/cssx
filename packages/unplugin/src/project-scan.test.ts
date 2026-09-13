import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
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
});
