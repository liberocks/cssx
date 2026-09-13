import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import vue from '@vitejs/plugin-vue';
import { build, createServer } from 'vite';
import { describe, expect, it } from 'vitest';
import cssxVite from '../src/vite';

const require = createRequire(import.meta.url);

/** Reads a CSSX virtual Vite asset without opening a network socket. */
async function readViteAsset(server: { readonly middlewares: unknown }, url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const headers = new Map<string, string>();
    const middlewares = server.middlewares as (
      request: { url: string; headers: Record<string, string>; method: string },
      response: {
        statusCode: number;
        setHeader(name: string, value: string): void;
        getHeader(name: string): string | undefined;
        hasHeader(name: string): boolean;
        removeHeader(name: string): void;
        writeHead(status: number): void;
        end(body?: string): void;
      },
      next: (error?: unknown) => void,
    ) => void;
    middlewares(
      { url, headers: {}, method: 'GET' },
      {
        statusCode: 200,
        setHeader(name, value) {
          headers.set(name.toLowerCase(), value);
        },
        getHeader(name) {
          return headers.get(name.toLowerCase());
        },
        hasHeader(name) {
          return headers.has(name.toLowerCase());
        },
        removeHeader(name) {
          headers.delete(name.toLowerCase());
        },
        writeHead(status) {
          this.statusCode = status;
        },
        end(body = '') {
          resolve(body);
        },
      },
      (error) => reject(error ?? new Error(`No Vite middleware served ${url}.`)),
    );
  });
}

describe('CSSX Vite fixture', () => {
  it('extracts CSSX calls from Vue SFC script setup and template bindings', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cssx-vite-vue-'));
    try {
      await mkdir(join(root, 'src'));
      await writeFile(
        join(root, 'src/App.vue'),
        `<script setup lang="ts">
import * as cssx from '@cssxio/cssx';
import { sx } from '@cssxio/cssx';
const styles = cssx.create({ title: 'text-3xl font-semibold' });
const title = cssx.props(styles.title);
const active = true;
</script>
<template><main :class="sx(title.className, 'p-4', active && 'text-blue-500')">CSSX</main></template>`,
      );
      await writeFile(
        join(root, 'src/main.ts'),
        "import { createApp } from 'vue'; import App from './App.vue'; createApp(App).mount('#app');",
      );
      await writeFile(
        join(root, 'index.html'),
        '<div id="app"></div><script type="module" src="/src/main.ts"></script>',
      );

      await build({
        root,
        logLevel: 'silent',
        plugins: [cssxVite({ cssFileName: 'assets/cssx.css', sourceMap: false }), vue()],
        resolve: { alias: { vue: require.resolve('vue'), '@cssxio/cssx': require.resolve('@cssxio/cssx') } },
        build: { emptyOutDir: true, outDir: 'dist' },
      });

      const css = await readFile(join(root, 'dist/assets/cssx.css'), 'utf8');
      expect(css).toContain('font-size:1.875rem');
      expect(css).toContain('font-weight:600');
      expect(css).toContain('padding:calc(0.25rem * 4)');
      expect(css).toContain('color:oklch(62.27% 0.214 259.815)');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

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
    });
    try {
      await mkdir(join(root, 'src'));
      await writeFile(
        join(root, 'src/main.ts'),
        "import * as cssx from '@cssxio/cssx'; export const styles = cssx.create({ root: 'p-5 bg-brand' });",
      );
      const initial = await server.environments.client.transformRequest('/src/main.ts');
      const css = await readViteAsset(server, '/cssx.css');

      expect(css).toContain('padding:calc(var(--spacing) * 5)');
      expect(css).toContain('background-color:var(--color-brand)');
      const map = JSON.parse(await readViteAsset(server, '/cssx.css.map')) as { sources: string[] };
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
      const updated = await readViteAsset(server, '/cssx.css');
      expect(updated).toContain('background-color:var(--color-red-500)');

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
      const recovered = await readViteAsset(server, '/cssx.css');
      expect(recovered).toContain('color:var(--color-white)');

      await rm(join(root, 'src/main.ts'));
      server.watcher.emit('unlink', active.file);
      server.environments.client.moduleGraph.onFileDelete(active.file);
      const deleted = await readViteAsset(server, '/cssx.css');
      expect(deleted).toContain('box-sizing:border-box');
    } finally {
      await server.close();
      await rm(root, { recursive: true, force: true });
    }
  });
});
