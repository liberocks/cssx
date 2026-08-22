import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build, context } from 'esbuild';
import type { Plugin } from 'esbuild';
import { describe, expect, it } from 'vitest';
import cssxEsbuild from '../src/esbuild';

describe('CSSX esbuild fixture', () => {
  it('adds CSS to a real in-memory esbuild output', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cssx-esbuild-'));
    try {
      const entry = join(root, 'main.ts');
      await writeFile(
        entry,
        "import * as cssx from '@cssxio/cssx'; export const styles = cssx.create({ root: 'p-2 bg-red-500' });",
      );
      const result = await build({
        absWorkingDir: root,
        bundle: true,
        entryPoints: [entry],
        format: 'esm',
        metafile: true,
        outdir: 'dist',
        plugins: [cssxEsbuild({ cssFileName: 'assets/cssx.css' })],
        write: false,
      });
      const css = result.outputFiles?.find((file) => file.path.endsWith('assets/cssx.css'));
      const map = result.outputFiles?.find((file) => file.path.endsWith('assets/cssx.css.map'));

      expect(result.outputFiles?.[0]?.text).not.toContain('@cssxio/cssx');
      expect(result.outputFiles?.map((file) => file.path)).toContain(join(root, 'dist', 'assets', 'cssx.css'));
      expect(css?.text).toContain('padding:calc(0.25rem * 2)');
      expect(css?.text).toContain('background-color:#ef4444');
      expect(
        (JSON.parse(map?.text ?? '') as { sources: string[] }).sources.some(
          (source) => source.endsWith('/main.ts') || source === 'main.ts',
        ),
      ).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('updates and removes the extracted CSS asset across native esbuild rebuilds', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cssx-esbuild-rebuild-'));
    const entry = join(root, 'main.ts');
    const styles = join(root, 'styles.ts');
    const buildContext = await context({
      absWorkingDir: root,
      bundle: true,
      entryPoints: [entry],
      format: 'esm',
      outdir: 'dist',
      plugins: [cssxEsbuild()],
      write: false,
    });
    try {
      await writeFile(entry, "export { styles } from './styles.ts';");
      await writeFile(
        styles,
        "import * as cssx from '@cssxio/cssx'; export const styles = cssx.create({ root: 'p-4' });",
      );
      const first = await buildContext.rebuild();
      expect(first.outputFiles?.find((file) => file.path.endsWith('cssx.css'))?.text).toContain(
        'padding:calc(0.25rem * 4)',
      );

      await writeFile(
        styles,
        "import * as cssx from '@cssxio/cssx'; export const styles = cssx.create({ root: 'bg-red-500' });",
      );
      const updated = await buildContext.rebuild();
      const updatedCss = updated.outputFiles?.find((file) => file.path.endsWith('cssx.css'))?.text ?? '';
      expect(updatedCss).toContain('background-color:#ef4444');
      expect(updatedCss).not.toContain('padding:calc(0.25rem * 4)');

      await writeFile(entry, 'export const noStyles = true;');
      const removed = await buildContext.rebuild();
      expect(removed.outputFiles?.some((file) => file.path.endsWith('cssx.css'))).toBe(false);
    } finally {
      await buildContext.dispose();
      await rm(root, { recursive: true, force: true });
    }
  });

  it('updates extracted CSS through native esbuild watch mode', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cssx-esbuild-watch-'));
    const entry = join(root, 'main.ts');
    const output = join(root, 'dist');
    let completedBuilds = 0;
    let resolveBuild: (() => void) | undefined;
    const observer: Plugin = {
      name: 'cssx-watch-observer',
      setup(build) {
        build.onEnd(() => {
          completedBuilds++;
          resolveBuild?.();
          resolveBuild = undefined;
        });
      },
    };
    const buildContext = await context({
      absWorkingDir: root,
      bundle: true,
      entryPoints: [entry],
      format: 'esm',
      outdir: 'dist',
      plugins: [cssxEsbuild(), observer],
    });
    const nextBuild = () => {
      const expected = completedBuilds + 1;
      return new Promise<void>((resolvePromise, reject) => {
        if (completedBuilds >= expected) {
          return resolvePromise();
        }
        const timeout = setTimeout(() => reject(new Error('esbuild watch rebuild timed out.')), 10_000);
        resolveBuild = () => {
          clearTimeout(timeout);
          resolvePromise();
        };
      });
    };
    try {
      await writeFile(
        entry,
        "import * as cssx from '@cssxio/cssx'; export const styles = cssx.create({ root: 'p-4' });",
      );
      const initial = nextBuild();
      await buildContext.watch();
      await initial;
      expect(await readFile(join(output, 'cssx.css'), 'utf8')).toContain('padding:calc(0.25rem * 4)');

      const rebuilt = nextBuild();
      await writeFile(
        entry,
        "import * as cssx from '@cssxio/cssx'; export const styles = cssx.create({ root: 'bg-red-500' });",
      );
      await rebuilt;
      const css = await readFile(join(output, 'cssx.css'), 'utf8');
      expect(css).toContain('background-color:#ef4444');
      expect(css).not.toContain('padding:calc(0.25rem * 4)');
    } finally {
      await buildContext.dispose();
      await rm(root, { recursive: true, force: true });
    }
  }, 15_000);

  it('handles esbuild host edge cases for missing metadata, collisions, and disk output', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cssx-esbuild-host-'));
    const entry = join(root, 'entry.jsx');
    let onLoad: ((args: { path: string }) => Promise<unknown>) | undefined;
    let onEnd: ((result: any) => Promise<void>) | undefined;
    const build: any = {
      initialOptions: { absWorkingDir: root, outdir: 'dist', write: false },
      onLoad(_options: unknown, callback: (args: { path: string }) => Promise<unknown>) {
        onLoad = callback;
      },
      onEnd(callback: (result: any) => Promise<void>) {
        onEnd = callback;
      },
    };
    try {
      await writeFile(
        entry,
        "import * as cssx from '@cssxio/cssx'; export const styles = cssx.create({ root: 'p-4' });",
      );
      cssxEsbuild().setup(build);
      await onEnd?.({});
      await onLoad?.({ path: entry });

      await onEnd?.({ metafile: { inputs: { 'entry.jsx': {} } } });
      const assetPath = join(root, 'dist', 'cssx.css');
      await expect(
        onEnd?.({ metafile: { inputs: { 'entry.jsx': {} } }, outputFiles: [{ path: assetPath }] }),
      ).rejects.toThrow('CSS asset collision');

      build.initialOptions.write = true;
      await onEnd?.({ metafile: { inputs: { 'entry.jsx': {} } } });
      expect(await readFile(assetPath, 'utf8')).toContain('padding:calc(0.25rem * 4)');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
