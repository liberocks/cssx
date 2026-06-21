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
