import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

import { installFakeMdxCompiler } from '../../test-support/install-fake-mdx';
import { canonicalPathSync } from '../core/canonical-path';
import { developmentPluginOptions } from '../core/options';
import { compileCssxStylesheet } from '../native/stylesheet';
import {
  getCachedProjectScanSourceModules,
  getProjectScanClassNameAllocator,
  releaseProjectScan,
  retainProjectScan,
  scanProjectCssxSourceModules,
  updateProjectScanModule,
} from './project-scan';
import { transformCssxModule } from './transform';

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
      await expect(
        updateProjectScanModule(
          root,
          join(root, 'src', 'server-component.tsx'),
          {
            coordination: 'manifest',
            manifestPath,
          },
          null,
        ),
      ).resolves.toBe(false);
      const stylesheet = await compileCssxStylesheet(modules, undefined, undefined, false);
      expect(stylesheet.css).toContain('.s0x');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('collects MDX modules through manifest coordination', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cssx-project-scan-manifest-mdx-'));
    const manifestPath = join(root, '.cssx', 'classnames.json');
    const source = `import { sx } from "@cssxio/cssx"; export const className = sx("p-4");`;
    try {
      await installFakeMdxCompiler(root, source);
      await writeFile(join(root, 'content.mdx'), source);

      const modules = await scanProjectCssxSourceModules(root, {
        naming: 'source',
        coordination: 'manifest',
        manifestPath,
        sourceMap: false,
        preflight: false,
      });

      expect(modules).toHaveLength(1);
      expect(modules[0]?.candidates).toHaveProperty('p-4');
      expect(await readFile(manifestPath, 'utf8')).toContain('s1x');
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

  it('reuses unchanged source metadata and refreshes changed and deleted files', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cssx-project-scan-cache-'));
    const source = join(root, 'src', 'component.tsx');
    const options = { naming: 'source' as const, stableClassNames: true, className: { variant: 'random' as const } };
    try {
      await mkdir(join(root, 'src'), { recursive: true });
      await writeFile(source, `import { sx } from '@cssxio/cssx'; export const className = sx('p-4');`);
      await mkdir(join(root, '.open-next'), { recursive: true });
      await writeFile(
        join(root, '.open-next', 'handler.mjs'),
        `import { sx } from '@cssxio/cssx'; export const className = sx('p-1');`,
      );
      expect(getCachedProjectScanSourceModules(root, options)).toBeUndefined();
      const first = await scanProjectCssxSourceModules(root, options);
      expect(getCachedProjectScanSourceModules(root, options)?.[0]).toBe(first[0]);
      const firstClass = first[0]?.composites && Object.keys(first[0].composites)[0];
      expect(first[0]?.candidates).toHaveProperty('p-4');
      expect(first).toHaveLength(1);

      const unchanged = await scanProjectCssxSourceModules(root, options);
      expect(unchanged[0]).toBe(first[0]);

      const oldSource = `import { sx } from '@cssxio/cssx'; export const className = sx('p-4');`;
      const changedSource = `import { sx } from '@cssxio/cssx'; export const className = sx('p-8');`;
      await writeFile(source, changedSource);
      const staleTransform = await transformCssxModule(oldSource, source, {
        ...options,
        stableClassNameFileName: 'src/component.tsx',
      });
      await expect(updateProjectScanModule(root, source, options, staleTransform, oldSource)).resolves.toBe(false);
      expect(getCachedProjectScanSourceModules(root, options)?.[0]?.candidates).toHaveProperty('p-4');

      const transformed = await transformCssxModule(changedSource, source, {
        ...options,
        stableClassNameFileName: 'src/component.tsx',
      });
      await expect(updateProjectScanModule(root, source, options, transformed, changedSource)).resolves.toBe(true);
      const changed = await scanProjectCssxSourceModules(root, options);
      expect(changed[0]?.candidates).toHaveProperty('p-8');
      expect(changed[0]?.composites).toHaveProperty(firstClass!);

      await writeFile(source, changedSource);
      await scanProjectCssxSourceModules(root, options);
      await rm(source);
      await expect(updateProjectScanModule(root, source, options, null)).resolves.toBe(true);

      await writeFile(source, changedSource);
      await scanProjectCssxSourceModules(root, options);
      await rm(source);
      const deletedDuringUpdate = updateProjectScanModule(root, source, options, null);
      releaseProjectScan(root, options);
      await expect(deletedDuringUpdate).resolves.toBe(false);
      await expect(scanProjectCssxSourceModules(root, options)).resolves.toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('keeps project and module identity stable when a transform uses a symlinked workspace path', async () => {
    const temporaryRoot = await mkdtemp(join(tmpdir(), 'cssx-project-scan-symlink-'));
    const root = join(temporaryRoot, 'project');
    const alias = join(temporaryRoot, 'workspace-link');
    const source = join(root, 'src', 'component.tsx');
    const aliasSource = join(alias, 'src', 'component.tsx');
    const options = { mode: 'development' as const, naming: 'source' as const, stableClassNames: true };
    const initialSource = `import { sx } from '@cssxio/cssx'; export const className = sx('p-4');`;
    const updatedSource = `import { sx } from '@cssxio/cssx'; export const className = sx('p-8');`;
    try {
      await mkdir(join(root, 'src'), { recursive: true });
      await writeFile(source, initialSource);
      await symlink(root, alias, 'dir');
      await scanProjectCssxSourceModules(root, options);
      const transformed = await transformCssxModule(updatedSource, aliasSource, {
        ...options,
        stableClassNameFileName: 'src/component.tsx',
      });

      await writeFile(source, updatedSource);
      await expect(updateProjectScanModule(alias, aliasSource, options, transformed, updatedSource)).resolves.toBe(
        true,
      );

      const cached = getCachedProjectScanSourceModules(root, options);
      expect(cached).toHaveLength(1);
      expect(cached?.[0]?.id).toBe(canonicalPathSync(source));
      expect(cached?.[0]?.candidates).toHaveProperty('p-8');
      expect(cached?.[0]?.candidates).not.toHaveProperty('p-4');
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });

  it('bounds retained snapshots for projects that are no longer active', async () => {
    const roots = await Promise.all(
      Array.from({ length: 9 }, () => mkdtemp(join(tmpdir(), 'cssx-project-cache-bound-'))),
    );
    const options = { sourceMap: false, preflight: false };
    try {
      for (const root of roots) {
        getProjectScanClassNameAllocator(root, options);
      }

      expect(getCachedProjectScanSourceModules(roots[0]!, options)).toBeUndefined();
      expect(getCachedProjectScanSourceModules(roots.at(-1)!, options)).toEqual([]);
    } finally {
      await Promise.all(roots.map((root) => rm(root, { recursive: true, force: true })));
    }
  });

  it('keeps active project snapshots while pruning inactive configurations', async () => {
    const activeRoot = await mkdtemp(join(tmpdir(), 'cssx-project-cache-active-'));
    const inactiveRoots = await Promise.all(
      Array.from({ length: 9 }, () => mkdtemp(join(tmpdir(), 'cssx-project-cache-inactive-'))),
    );
    const options = { sourceMap: false, preflight: false };
    try {
      retainProjectScan(activeRoot, options);
      await scanProjectCssxSourceModules(activeRoot, options);
      for (const root of inactiveRoots) {
        getProjectScanClassNameAllocator(root, options);
      }

      expect(getCachedProjectScanSourceModules(activeRoot, options)).toEqual([]);
    } finally {
      releaseProjectScan(activeRoot, options);
      await rm(activeRoot, { recursive: true, force: true });
      await Promise.all(inactiveRoots.map((root) => rm(root, { recursive: true, force: true })));
    }
  });

  it('measures 30 warm cached edits across 400 sources while excluding generated bundles', async () => {
    const temporaryRoot = await mkdtemp(join(tmpdir(), 'cssx-project-scan-benchmark-'));
    const root = join(temporaryRoot, 'app');
    const sharedRoot = join(temporaryRoot, 'shared');
    const changedFile = join(sharedRoot, 'Quiz.tsx');
    const developmentOptions = developmentPluginOptions({
      sourceRoots: [relative(root, sharedRoot)],
      sourceMap: false,
      preflight: false,
    });
    const sourceFor = (utility: string) =>
      `import { sx } from '@cssxio/cssx'; export const className = sx('${utility}');`;

    try {
      await mkdir(join(root, 'src'), { recursive: true });
      await mkdir(sharedRoot, { recursive: true });
      const sourceFiles = Array.from({ length: 399 }, (_, index) =>
        writeFile(join(root, 'src', `component-${index}.tsx`), sourceFor('p-4 bg-slate-100')),
      );
      await Promise.all(sourceFiles);
      await writeFile(changedFile, sourceFor('p-4 bg-slate-100'));
      await mkdir(join(root, '.open-next'), { recursive: true });
      await writeFile(
        join(root, '.open-next', 'handler.mjs'),
        `import { sx } from '@cssxio/cssx';\n${'export const className = sx("p-1");\n'.repeat(300_000)}`,
      );

      const initial = await scanProjectCssxSourceModules(root, developmentOptions);
      expect(initial).toHaveLength(400);
      const samples: number[] = [];
      for (let edit = 0; edit < 30; edit++) {
        const utility = edit % 2 === 0 ? 'px-8 py-3' : 'p-4 bg-slate-100';
        const source = sourceFor(utility);
        const started = performance.now();
        await writeFile(changedFile, source);
        const transformed = await transformCssxModule(
          source,
          changedFile,
          {
            ...developmentOptions,
            stableClassNameFileName: relative(root, changedFile).replaceAll('\\', '/'),
          },
          undefined,
          { compileCss: false },
        );
        await updateProjectScanModule(root, changedFile, developmentOptions, transformed, source);
        const modules = getCachedProjectScanSourceModules(root, developmentOptions);
        const stylesheet = await compileCssxStylesheet(modules ?? [], undefined, undefined, false, undefined, false);
        const elapsed = performance.now() - started;
        samples.push(elapsed);
        expect(stylesheet.css).toContain(utility.startsWith('px-') ? 'padding-left:' : 'padding:');
        expect(elapsed, `warm cached edit ${edit + 1}`).toBeLessThanOrEqual(100);
      }
      samples.sort((left, right) => left - right);
      console.info(
        `CSSX warm cached edit benchmark: p50 ${samples[14]!.toFixed(1)} ms, p95 ${samples[28]!.toFixed(1)} ms, max ${samples[29]!.toFixed(1)} ms.`,
      );
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  }, 30_000);

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

  it('scans MDX with the production classname allocator when stable naming is disabled', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cssx-project-scan-mdx-serial-'));
    try {
      await installFakeMdxCompiler(
        root,
        `import { sx } from '@cssxio/cssx'; export default function MDXContent() { return <div className={sx('p-4')}>Styled</div>; }`,
      );
      await writeFile(
        join(root, 'content.md'),
        "import { sx } from '@cssxio/cssx';\n\n<div className={sx('p-4')}>Styled</div>",
      );

      const modules = await scanProjectCssxSourceModules(root, { sourceMap: false, preflight: false });

      expect(modules).toHaveLength(1);
      expect(modules[0]?.candidates).toHaveProperty('p-4');
      expect(Object.keys(modules[0]?.composites ?? [])[0]).toBe('s0x');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
