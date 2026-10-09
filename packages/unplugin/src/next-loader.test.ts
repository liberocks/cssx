import { mkdtemp, mkdir, readFile, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, it, vi } from 'vitest';

import cssxNextLoader, { type CssxNextLoaderOptions } from './next-loader';

const nextExampleRoot = resolve(import.meta.dirname, '../../../examples/next');
const importSource = '@cssxio/cssx';

it('prepares a root layout stylesheet, dependencies, maps, themes, and diagnostics', async () => {
  const temporaryRoot = await mkdtemp(join(tmpdir(), 'cssx-next-loader-'));
  const root = join(temporaryRoot, 'app');
  const linkedRoot = join(temporaryRoot, 'linked');
  const styleSheetFile = join(root, '.cssx', 'next.css');
  const manifestPath = join(root, '.cssx', 'classnames.json');
  const layoutFile = join(root, 'app', 'layout.tsx');
  const layout = `import { sx } from '${importSource}'; export default function Layout({ children }) { return <html><body className={sx('p-4 bg-brand')}>{children}</body></html>; }`;
  const linkedFile = join(linkedRoot, 'Linked.tsx');
  const linkedSource = `import { sx } from '${importSource}'; export const linkedClass = sx('rounded-full');`;
  const themeFile = join(root, 'theme.css');
  const consoleInfo = vi.spyOn(console, 'info').mockImplementation(() => undefined);

  try {
    await mkdir(join(root, 'app'), { recursive: true });
    await mkdir(linkedRoot, { recursive: true });
    await writeFile(join(root, 'package.json'), '{}');
    await writeFile(layoutFile, layout);
    await writeFile(join(root, 'app', 'page.tsx'), linkedSource);
    await writeFile(linkedFile, linkedSource);
    await writeFile(themeFile, '@theme reference { --color-brand: #171717; }');

    const settings: CssxNextLoaderOptions = {
      projectRoot: root,
      styleSheetFile,
      importSource,
      manifestPath,
      development: true,
      cssx: { sourceRoots: [linkedRoot], themeFile, sourceMap: true, preflight: false, debug: true },
    };
    const first = await runLoader(layoutFile, layout, settings);
    expect(first.code).toContain("import '../.cssx/next.css'");
    expect(first.map).toBeUndefined();
    expect(await readFile(styleSheetFile, 'utf8')).toContain('--color-brand:#171717');
    await expect(stat(`${styleSheetFile}.map`)).resolves.toBeDefined();
    expect(first.dependencies).toContain(linkedFile);
    expect(first.dependencies).toContain(themeFile);
    expect(first.contextDependencies).toContain(join(root, 'app'));
    expect(first.contextDependencies).toContain(linkedRoot);
    expect(consoleInfo).toHaveBeenCalledWith(expect.stringContaining('serial naming'));

    const second = await runLoader(layoutFile, layout, {
      ...settings,
      cssx: { ...settings.cssx, debug: { reportFile: '.cssx/debug/report.json' } },
    });
    expect(second.code).toBe(first.code);
    expect(await readFile(join(root, '.cssx/debug/report.json'), 'utf8')).toContain('selectorFound');
    expect(await readFile(styleSheetFile, 'utf8')).toContain('--color-brand:#171717');
  } finally {
    consoleInfo.mockRestore();
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

it('refreshes styles for CSSX modules during development and honors inline themes', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-next-dev-'));
  const pageFile = join(root, 'page.tsx');
  const styleSheetFile = join(root, '.cssx', 'next.css');
  const source = `import { sx } from '${importSource}'; export const className = sx('p-4 bg-brand');`;
  try {
    await writeFile(join(root, 'package.json'), '{}');
    await writeFile(pageFile, source);
    const result = await runLoader(pageFile, source, {
      projectRoot: root,
      styleSheetFile,
      importSource,
      manifestPath: join(root, '.cssx', 'classnames.json'),
      development: true,
      cssx: { theme: '@theme reference { --color-brand: #171717; }', sourceMap: false, preflight: false },
    });
    expect(result.code).toContain('s');
    expect(result.map).toMatchObject({ version: 3 });
    expect(await readFile(styleSheetFile, 'utf8')).toContain('--color-brand:#171717');
    await expect(stat(`${styleSheetFile}.map`)).rejects.toMatchObject({ code: 'ENOENT' });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

it('compiles MDX source with source-addressed naming and appends input maps for plain modules', async () => {
  const settings: CssxNextLoaderOptions = {
    projectRoot: nextExampleRoot,
    styleSheetFile: join(tmpdir(), 'cssx-next-mdx.css'),
    importSource,
    manifestPath: join(tmpdir(), 'cssx-next-mdx-manifest.json'),
    development: false,
    cssx: { naming: 'source', sourceMap: false, preflight: false },
  };
  const mdx = await runLoader(
    resolve(nextExampleRoot, 'app/content.mdx'),
    `import { sx } from '${importSource}';\n\n<div className={sx('p-4')}>MDX</div>`,
    settings,
  );
  expect(mdx.code).toContain('MDX');
  expect(mdx.code).toContain('d');

  const inputMap = { version: 3 as const, sources: ['plain.ts'], names: [], mappings: '' };
  const plain = await runLoader(
    resolve(nextExampleRoot, 'plain.ts'),
    'export const plain = true;',
    { ...settings, projectRoot: '' },
    inputMap,
    nextExampleRoot,
  );
  expect(plain.code).toBe('export const plain = true;');
  expect(plain.map).toBe(inputMap);
});

it('uses process.cwd when both configured roots are empty and converts thrown values to Errors', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-next-root-fallback-'));
  try {
    const result = await runLoader(
      join(root, 'plain.ts'),
      'export const plain = true;',
      {
        projectRoot: '',
        styleSheetFile: join(root, 'generated.css'),
        importSource,
        manifestPath: join(root, 'classes.json'),
        development: false,
        cssx: {},
      },
      undefined,
      '',
    );
    expect(result.code).toBe('export const plain = true;');
    await expect(runLoader(join(root, 'broken.ts'), '', undefined as never)).rejects.toThrow('options unavailable');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

it('imports the generated stylesheet with a relative prefix when it shares the layout directory', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-next-loader-local-stylesheet-'));
  const layoutFile = join(root, 'app', 'layout.tsx');
  const source = 'export default function Layout({ children }) { return <html>{children}</html>; }';
  try {
    await mkdir(join(root, 'app'), { recursive: true });
    await writeFile(join(root, 'package.json'), '{}');
    await writeFile(layoutFile, source);

    const result = await runLoader(layoutFile, source, {
      projectRoot: root,
      styleSheetFile: join(root, 'app', 'cssx.css'),
      importSource,
      manifestPath: join(root, '.cssx', 'classes.json'),
      development: true,
      cssx: { preflight: false },
    });

    expect(result.code).toContain("import './cssx.css'");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

it('surfaces non-missing filesystem errors from watched project roots and stylesheet writes', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-next-loader-error-'));
  try {
    await writeFile(join(root, 'package.json'), '{}');
    await mkdir(join(root, 'app'), { recursive: true });
    await writeFile(join(root, 'app', 'layout.tsx'), 'export default function Layout() { return <html />; }');
    await symlink('pages', join(root, 'pages'));
    await expect(
      runLoader(join(root, 'app', 'layout.tsx'), 'export default function Layout() { return <html />; }', {
        projectRoot: root,
        styleSheetFile: join(root, '.cssx', 'next.css'),
        importSource,
        manifestPath: join(root, '.cssx', 'classnames.json'),
        development: false,
        cssx: { preflight: false },
      }),
    ).rejects.toMatchObject({ code: 'ELOOP' });

    const failingStylePath = join(root, 'block.css');
    await mkdir(failingStylePath);
    const pageFile = join(root, 'page.tsx');
    const pageSource = `import { sx } from '${importSource}'; export const className = sx('p-4');`;
    await writeFile(pageFile, pageSource);
    await expect(
      runLoader(pageFile, pageSource, {
        projectRoot: root,
        styleSheetFile: failingStylePath,
        importSource,
        manifestPath: join(root, 'classes.json'),
        development: true,
        cssx: { preflight: false },
      }),
    ).rejects.toMatchObject({ code: 'EISDIR' });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

function runLoader(
  resourcePath: string,
  source: string,
  settings: CssxNextLoaderOptions,
  inputMap?: {
    readonly version: 3;
    readonly sources: readonly string[];
    readonly names: readonly string[];
    readonly mappings: string;
  },
  rootContext?: string,
) {
  const dependencies: string[] = [];
  const contextDependencies: string[] = [];
  return new Promise<{ code: string; map?: unknown; dependencies: string[]; contextDependencies: string[] }>(
    (resolvePromise, rejectPromise) => {
      const context = {
        resourcePath,
        rootContext,
        async: () => (error: Error | null, code?: string, map?: unknown) => {
          if (error) {
            rejectPromise(error);
          } else {
            resolvePromise({ code: code ?? '', map, dependencies, contextDependencies });
          }
        },
        getOptions: () => {
          if (!settings) {
            throw 'options unavailable';
          }
          return settings;
        },
        addDependency: (path: string) => dependencies.push(path),
        addContextDependency: (path: string) => contextDependencies.push(path),
      };
      cssxNextLoader.call(context as never, source, inputMap as never);
    },
  );
}
