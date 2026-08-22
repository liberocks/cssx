import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rollup, watch } from 'rollup';
import type { OutputAsset, RollupWatcher, RollupWatcherEvent } from 'rollup';
import { describe, expect, it } from 'vitest';
import cssxRollup from '../src/rollup';

describe('CSSX Rollup fixture', () => {
  it('emits CSS from a real Rollup build output', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cssx-rollup-'));
    let bundle: Awaited<ReturnType<typeof rollup>> | undefined;
    try {
      const entry = join(root, 'main.js');
      await writeFile(
        entry,
        "import * as cssx from '@cssxio/cssx'; export const styles = cssx.create({ root: 'p-4 text-white' });",
      );
      bundle = await rollup({ input: entry, plugins: [cssxRollup()] });
      const generated = await bundle.generate({ format: 'es' });
      const css = generated.output.find(
        (output): output is OutputAsset => output.type === 'asset' && output.fileName === 'cssx.css',
      );

      expect(css?.type).toBe('asset');
      expect(String(css?.source)).toContain('padding:calc(0.25rem * 4)');
      expect(String(css?.source)).toContain('color:#fff');
    } finally {
      await bundle?.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  it('aggregates theme resources across modules and emits an origin-aware CSS map', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cssx-rollup-graph-'));
    let bundle: Awaited<ReturnType<typeof rollup>> | undefined;
    try {
      const first = join(root, 'first.js');
      const second = join(root, 'second.js');
      await writeFile(
        first,
        "import * as cssx from '@cssxio/cssx'; export const first = cssx.create({ root: 'p-2 animate-wiggle scrollbar-thumb-red-500' });",
      );
      await writeFile(
        second,
        "import * as cssx from '@cssxio/cssx'; export const second = cssx.create({ root: 'bg-brand animate-wiggle scrollbar-track-white' });",
      );
      bundle = await rollup({
        input: { first, second },
        plugins: [
          cssxRollup({
            theme:
              '@theme { --color-brand: #123456; --animate-wiggle: wiggle 1s linear infinite; @keyframes wiggle { to { opacity: 1; } } }',
          }),
        ],
      });
      const generated = await bundle.generate({ format: 'es' });
      const css = generated.output.find(
        (output): output is OutputAsset => output.type === 'asset' && output.fileName === 'cssx.css',
      );
      const map = generated.output.find(
        (output): output is OutputAsset => output.type === 'asset' && output.fileName === 'cssx.css.map',
      );

      expect(generated.output.filter((output) => output.type === 'chunk')).toHaveLength(2);
      expect(String(css?.source)).toContain('background-color:#123456');
      expect(String(css?.source).match(/@keyframes wiggle/g)).toHaveLength(1);
      expect(String(css?.source).match(/@property --cssx-scrollbar-(?:thumb|track)/g)).toHaveLength(2);
      expect(JSON.parse(String(map?.source)).sources).toEqual([first, second]);
    } finally {
      await bundle?.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  it('updates extracted CSS in a cached Rollup rebuild', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cssx-rollup-cache-'));
    let firstBundle: Awaited<ReturnType<typeof rollup>> | undefined;
    let rebuiltBundle: Awaited<ReturnType<typeof rollup>> | undefined;
    try {
      const entry = join(root, 'main.js');
      const plugin = cssxRollup();
      await writeFile(
        entry,
        "import * as cssx from '@cssxio/cssx'; export const styles = cssx.create({ root: 'p-4' });",
      );
      firstBundle = await rollup({ input: entry, plugins: [plugin] });
      const first = await firstBundle.generate({ format: 'es' });
      const firstCss = first.output.find(
        (output): output is OutputAsset => output.type === 'asset' && output.fileName === 'cssx.css',
      );
      expect(String(firstCss?.source)).toContain('padding:calc(0.25rem * 4)');

      await writeFile(
        entry,
        "import * as cssx from '@cssxio/cssx'; export const styles = cssx.create({ root: 'bg-red-500' });",
      );
      rebuiltBundle = await rollup({ input: entry, cache: firstBundle.cache, plugins: [plugin] });
      const rebuilt = await rebuiltBundle.generate({ format: 'es' });
      const rebuiltCss = rebuilt.output.find(
        (output): output is OutputAsset => output.type === 'asset' && output.fileName === 'cssx.css',
      );
      expect(String(rebuiltCss?.source)).toContain('background-color:#ef4444');
      expect(String(rebuiltCss?.source)).not.toContain('padding:calc(0.25rem * 4)');
    } finally {
      await rebuiltBundle?.close();
      await firstBundle?.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  it('updates extracted CSS through a native Rollup watcher', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cssx-rollup-watch-'));
    const output = join(root, 'dist');
    let watcher: RollupWatcher | undefined;
    try {
      const entry = join(root, 'main.js');
      await writeFile(
        entry,
        "import * as cssx from '@cssxio/cssx'; export const styles = cssx.create({ root: 'p-4' });",
      );
      watcher = watch({ input: entry, output: { dir: output, format: 'es' }, plugins: [cssxRollup()] });
      await waitForWatchEnd(watcher);
      expect(await readFile(join(output, 'cssx.css'), 'utf8')).toContain('padding:calc(0.25rem * 4)');

      const rebuilt = waitForWatchEnd(watcher);
      await writeFile(
        entry,
        "import * as cssx from '@cssxio/cssx'; export const styles = cssx.create({ root: 'bg-red-500' });",
      );
      await rebuilt;
      const css = await readFile(join(output, 'cssx.css'), 'utf8');
      expect(css).toContain('background-color:#ef4444');
      expect(css).not.toContain('padding:calc(0.25rem * 4)');
    } finally {
      await watcher?.close();
      await rm(root, { recursive: true, force: true });
    }
  }, 15_000);
});

function waitForWatchEnd(watcher: RollupWatcher): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    const onEvent = (event: RollupWatcherEvent) => {
      if (event.code === 'ERROR') {
        watcher.off('event', onEvent);
        reject(event.error ?? new Error('Rollup watch build failed.'));
      }
      if (event.code === 'BUNDLE_END') {
        void event.result?.close();
      }
      if (event.code === 'END') {
        watcher.off('event', onEvent);
        resolvePromise();
      }
    };
    watcher.on('event', onEvent);
  });
}
