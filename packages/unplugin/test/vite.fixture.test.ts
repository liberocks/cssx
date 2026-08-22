import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build, createServer } from 'vite';
import { describe, expect, it } from 'vitest';
import cssxVite from '../src/vite';

describe('CSSX Vite fixture', () => {
  it('emits CSS from a real Vite production library build', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cssx-vite-'));
    try {
      await mkdir(join(root, 'src'));
      await writeFile(
        join(root, 'src/main.ts'),
        "import * as cssx from '@cssxio/cssx'; export const styles = cssx.create({ root: 'p-5 hover:bg-red-500' });",
      );

      await build({
        root,
        logLevel: 'silent',
        plugins: [cssxVite({ cssFileName: 'assets/cssx.css', sourceMap: false })],
        build: {
          emptyOutDir: true,
          lib: { entry: join(root, 'src/main.ts'), formats: ['es'], fileName: 'main' },
          outDir: 'dist',
        },
      });

      const css = await readFile(join(root, 'dist/assets/cssx.css'), 'utf8');
      expect(css).toContain('padding:calc(0.25rem * 5)');
      expect(css).toContain('@media (hover: hover)');
      expect(css).not.toContain('sourceMappingURL');
      await expect(readFile(join(root, 'dist/assets/cssx.css.map'), 'utf8')).rejects.toThrow();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('serves virtual CSS and injects the development HMR listener through Vite', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cssx-vite-dev-'));
    const server = await createServer({
      root,
      logLevel: 'silent',
      plugins: [cssxVite({ theme: '@theme reference { --color-brand: #123456; }' })],
      server: { port: 0 },
    });
    try {
      await mkdir(join(root, 'src'));
      await writeFile(
        join(root, 'src/main.ts'),
        "import * as cssx from '@cssxio/cssx'; export const styles = cssx.create({ root: 'p-5 bg-brand' });",
      );
      await server.listen();
      const initial = await server.environments.client.transformRequest('/src/main.ts');
      const origin = server.resolvedUrls?.local[0];
      if (!origin) {
        throw new Error('Vite did not provide a local development URL.');
      }
      const response = await fetch(`${origin}cssx.css`);
      const css = await response.text();

      expect(css).toContain('padding:calc(var(--spacing) * 5)');
      expect(css).toContain('background-color:var(--color-brand)');
      const map = (await fetch(`${origin}cssx.css.map`).then((result) => result.json())) as { sources: string[] };
      expect(map.sources.some((source) => source.endsWith('/src/main.ts') || source === 'src/main.ts')).toBe(true);

      await writeFile(
        join(root, 'src/main.ts'),
        "import * as cssx from '@cssxio/cssx'; export const styles = cssx.create({ root: 'bg-red-500' });",
      );
      const active = await server.environments.client.moduleGraph.getModuleByUrl('/src/main.ts');
      if (!active?.file) {
        throw new Error('Vite did not retain the transformed source module.');
      }
      server.watcher.emit('change', active.file);
      server.environments.client.moduleGraph.onFileChange(active.file);
      const transformed = await server.environments.client.transformRequest('/src/main.ts');
      expect(transformed?.code).not.toBe(initial?.code);
      const updated = await fetch(`${origin}cssx.css`);
      expect(await updated.text()).toContain('background-color:var(--color-red-500)');

      await writeFile(
        join(root, 'src/main.ts'),
        "import * as cssx from '@cssxio/cssx'; export const styles = cssx.create({ root: 'not-a-utility' });",
      );
      server.watcher.emit('change', active.file);
      server.environments.client.moduleGraph.onFileChange(active.file);
      await expect(server.environments.client.transformRequest('/src/main.ts')).rejects.toThrow('cannot');

      await writeFile(
        join(root, 'src/main.ts'),
        "import * as cssx from '@cssxio/cssx'; export const styles = cssx.create({ root: 'text-white' });",
      );
      server.watcher.emit('change', active.file);
      server.environments.client.moduleGraph.onFileChange(active.file);
      await server.environments.client.transformRequest('/src/main.ts');
      const recovered = await fetch(`${origin}cssx.css`);
      expect(await recovered.text()).toContain('color:var(--color-white)');

      await rm(join(root, 'src/main.ts'));
      server.watcher.emit('unlink', active.file);
      server.environments.client.moduleGraph.onFileDelete(active.file);
      const deleted = await fetch(`${origin}cssx.css`);
      expect(await deleted.text()).toBe('');
    } finally {
      await server.close();
      await rm(root, { recursive: true, force: true });
    }
  });
});
