import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it, vi } from 'vitest';

import cssxNextLoader from './next-loader';
import type { CssxNextLoaderOptions } from './next-loader';

const conflictingModules = vi.hoisted(() => [
  { id: '/project/server.tsx', candidates: { 'p-4': 's0x' }, atomicClasses: ['s0x'] },
  { id: '/project/client.tsx', candidates: { 'p-4': 's1x' }, atomicClasses: ['s1x'] },
]);

vi.mock('./project-scan', () => ({
  scanProjectCssxSourceModules: async () => conflictingModules,
}));

it('prints compiler mapping conflicts in the Next loader debug summary', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-next-loader-conflicts-'));
  const layout = join(root, 'app', 'layout.tsx');
  const source =
    "import { sx } from '@cssxio/cssx'; export default function Layout() { return <html className={sx('p-4')} />; }";
  const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
  try {
    await mkdir(join(root, 'app'), { recursive: true });
    await writeFile(join(root, 'package.json'), '{}');
    await writeFile(layout, source);
    await runLoader(layout, source, {
      projectRoot: root,
      styleSheetFile: join(root, '.cssx', 'next.css'),
      importSource: '@cssxio/cssx',
      manifestPath: join(root, '.cssx', 'classes.json'),
      development: true,
      cssx: { debug: true, preflight: false },
    });

    expect(info).toHaveBeenCalledWith(expect.stringContaining('(1 utility conflicts)'));
  } finally {
    info.mockRestore();
    await rm(root, { recursive: true, force: true });
  }
});

function runLoader(resourcePath: string, source: string, settings: CssxNextLoaderOptions) {
  return new Promise<void>((resolvePromise, reject) => {
    const context = {
      resourcePath,
      async: () => (error: Error | null) => (error ? reject(error) : resolvePromise()),
      getOptions: () => settings,
      addDependency: () => undefined,
      addContextDependency: () => undefined,
    };
    cssxNextLoader.call(context as never, source);
  });
}
