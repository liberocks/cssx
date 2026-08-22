import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rspack } from '@rspack/core';
import { describe, expect, it } from 'vitest';
import cssxRspack from '../src/rspack';

describe('CSSX Rspack fixture', () => {
  it('emits CSS from a real Rspack compilation', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cssx-rspack-'));
    const outputPath = join(root, 'dist');
    const compiler = rspack({
      context: root,
      entry: './src/main.js',
      mode: 'production',
      optimization: { minimize: false },
      output: { clean: true, filename: 'bundle.js', path: outputPath },
      plugins: [cssxRspack()],
    });
    try {
      await mkdir(join(root, 'src'));
      await writeFile(
        join(root, 'src/main.js'),
        "import * as cssx from '@cssxio/cssx'; export const styles = cssx.create({ root: 'p-1 bg-red-500' });",
      );
      const stats = await new Promise<NonNullable<Parameters<Parameters<typeof compiler.run>[0]>[1]>>(
        (resolvePromise, reject) => {
          compiler.run((error, result) => {
            if (error) {
              return reject(error);
            }
            if (!result) {
              return reject(new Error('Rspack did not return build stats.'));
            }
            if (result.hasErrors()) {
              return reject(new Error(result.toString({ all: false, errors: true })));
            }
            resolvePromise(result);
          });
        },
      );

      expect(stats.hasErrors()).toBe(false);
      const css = await readFile(join(outputPath, 'cssx.css'), 'utf8');
      const map = JSON.parse(await readFile(join(outputPath, 'cssx.css.map'), 'utf8')) as { sources: string[] };
      expect(css).toContain('padding:calc(0.25rem * 1)');
      expect(css).toContain('background-color:#ef4444');
      expect(map.sources.some((source) => source.endsWith('/src/main.js'))).toBe(true);

      await writeFile(
        join(root, 'src/main.js'),
        "import * as cssx from '@cssxio/cssx'; export const styles = cssx.create({ root: 'text-white' });",
      );
      const rebuilt = await new Promise<NonNullable<Parameters<Parameters<typeof compiler.run>[0]>[1]>>(
        (resolvePromise, reject) => {
          compiler.run((error, result) => {
            if (error) {
              return reject(error);
            }
            if (!result) {
              return reject(new Error('Rspack did not return rebuild stats.'));
            }
            if (result.hasErrors()) {
              return reject(new Error(result.toString({ all: false, errors: true })));
            }
            resolvePromise(result);
          });
        },
      );
      expect(rebuilt.hasErrors()).toBe(false);
      const rebuiltCss = await readFile(join(outputPath, 'cssx.css'), 'utf8');
      expect(rebuiltCss).toContain('color:#fff');
      expect(rebuiltCss).not.toContain('background-color:#ef4444');
    } finally {
      await new Promise<void>((resolvePromise, reject) =>
        compiler.close((error) => (error ? reject(error) : resolvePromise())),
      );
      await rm(root, { recursive: true, force: true });
    }
  });

  it('updates extracted CSS through Rspack watch mode', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cssx-rspack-watch-'));
    const outputPath = join(root, 'dist');
    const compiler = rspack({
      context: root,
      entry: './src/main.js',
      mode: 'production',
      optimization: { minimize: false },
      output: { clean: true, filename: 'bundle.js', path: outputPath },
      plugins: [cssxRspack()],
    });
    let watching: { close(callback: (error?: Error | null) => void): void } | undefined;
    try {
      await mkdir(join(root, 'src'));
      const entry = join(root, 'src/main.js');
      await writeFile(
        entry,
        "import * as cssx from '@cssxio/cssx'; export const styles = cssx.create({ root: 'p-2' });",
      );
      type RspackStats = NonNullable<Parameters<Parameters<typeof compiler.run>[0]>[1]>;
      const builds: RspackStats[] = [];
      let watchError: Error | undefined;
      const nextBuild = () =>
        new Promise<RspackStats>((resolvePromise, reject) => {
          const timeout = setTimeout(() => reject(new Error('Rspack watch rebuild timed out.')), 10_000);
          const check = () => {
            if (watchError) {
              clearTimeout(timeout);
              reject(watchError);
              return;
            }
            const result = builds.shift();
            if (result) {
              clearTimeout(timeout);
              resolvePromise(result);
            } else {
              setTimeout(check, 5);
            }
          };
          check();
        });
      watching = compiler.watch({}, (error, result) => {
        if (error) {
          watchError = error;
          return;
        }
        if (!result) {
          watchError = new Error('Rspack watch did not return build stats.');
          return;
        }
        if (result.hasErrors()) {
          watchError = new Error(result.toString({ all: false, errors: true }));
          return;
        }
        builds.push(result);
      });
      expect((await nextBuild()).hasErrors()).toBe(false);
      expect(await readFile(join(outputPath, 'cssx.css'), 'utf8')).toContain('padding:calc(0.25rem * 2)');

      const rebuilt = nextBuild();
      await writeFile(
        entry,
        "import * as cssx from '@cssxio/cssx'; export const styles = cssx.create({ root: 'text-white' });",
      );
      expect((await rebuilt).hasErrors()).toBe(false);
      const css = await readFile(join(outputPath, 'cssx.css'), 'utf8');
      expect(css).toContain('color:#fff');
      expect(css).not.toContain('padding:calc(0.25rem * 2)');
    } finally {
      await new Promise<void>((resolvePromise, reject) =>
        watching
          ? watching.close((error) => (error ? reject(error) : resolvePromise()))
          : compiler.close((error) => (error ? reject(error) : resolvePromise())),
      );
      await rm(root, { recursive: true, force: true });
    }
  }, 15_000);
});
