import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import webpack from 'webpack';
import { describe, expect, it } from 'vitest';
import cssxWebpack from '../src/webpack';

describe('CSSX Webpack fixture', () => {
  it('emits CSS from a real Webpack compilation', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cssx-webpack-'));
    const outputPath = join(root, 'dist');
    const compiler = webpack({
      context: root,
      entry: './src/main.js',
      mode: 'production',
      optimization: { minimize: false },
      output: { clean: true, filename: 'bundle.js', path: outputPath },
      plugins: [cssxWebpack({ stableClassNames: true })],
    });
    try {
      await mkdir(join(root, 'src'));
      await writeFile(
        join(root, 'src/main.js'),
        "import * as cssx from '@cssxio/cssx'; export const styles = cssx.create({ root: 'p-3 text-white' });",
      );
      const stats = await new Promise<webpack.Stats>((resolvePromise, reject) => {
        compiler.run((error, result) => {
          if (error) {
            return reject(error);
          }
          if (!result) {
            return reject(new Error('Webpack did not return build stats.'));
          }
          if (result.hasErrors()) {
            return reject(new Error(result.toString({ all: false, errors: true })));
          }
          resolvePromise(result);
        });
      });

      expect(stats.hasErrors()).toBe(false);
      const css = await readFile(join(outputPath, 'cssx.css'), 'utf8');
      const map = JSON.parse(await readFile(join(outputPath, 'cssx.css.map'), 'utf8')) as { sources: string[] };
      expect(css).toContain('padding:calc(0.25rem * 3)');
      expect(css).toContain('color:#fff');
      expect(map.sources.some((source) => source.endsWith('/src/main.js'))).toBe(true);

      await writeFile(
        join(root, 'src/main.js'),
        "import * as cssx from '@cssxio/cssx'; export const styles = cssx.create({ root: 'bg-red-500' });",
      );
      const rebuilt = await new Promise<webpack.Stats>((resolvePromise, reject) => {
        compiler.run((error, result) => {
          if (error) {
            return reject(error);
          }
          if (!result) {
            return reject(new Error('Webpack did not return rebuild stats.'));
          }
          if (result.hasErrors()) {
            return reject(new Error(result.toString({ all: false, errors: true })));
          }
          resolvePromise(result);
        });
      });
      expect(rebuilt.hasErrors()).toBe(false);
      const rebuiltCss = await readFile(join(outputPath, 'cssx.css'), 'utf8');
      expect(rebuiltCss).toContain('background-color:oklch(63.71% 0.237 25.331)');
      expect(rebuiltCss).not.toContain('padding:calc(0.25rem * 3)');
    } finally {
      await new Promise<void>((resolvePromise, reject) =>
        compiler.close((error) => (error ? reject(error) : resolvePromise())),
      );
      await rm(root, { recursive: true, force: true });
    }
  });

  it('updates extracted CSS through Webpack watch mode', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cssx-webpack-watch-'));
    const outputPath = join(root, 'dist');
    const compiler = webpack({
      context: root,
      entry: './src/main.js',
      mode: 'production',
      optimization: { minimize: false },
      output: { clean: true, filename: 'bundle.js', path: outputPath },
      plugins: [cssxWebpack()],
    });
    let watching: { close(callback: (error?: Error | null) => void): void } | undefined;
    try {
      await mkdir(join(root, 'src'));
      const entry = join(root, 'src/main.js');
      await writeFile(
        entry,
        "import * as cssx from '@cssxio/cssx'; export const styles = cssx.create({ root: 'p-2' });",
      );
      const builds: webpack.Stats[] = [];
      let watchError: Error | undefined;
      const nextBuild = () =>
        new Promise<webpack.Stats>((resolvePromise, reject) => {
          const timeout = setTimeout(() => reject(new Error('Webpack watch rebuild timed out.')), 10_000);
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
          watchError = new Error('Webpack watch did not return build stats.');
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
