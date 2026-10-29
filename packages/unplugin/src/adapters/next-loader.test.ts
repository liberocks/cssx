import { mkdtemp, mkdir, readFile, readdir, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, it, vi } from 'vitest';

import { installFakeMdxCompiler } from '../../test-support/install-fake-mdx';
import { canonicalPathSync } from '../core/canonical-path';
import { developmentPluginOptions } from '../core/options';
import { getCachedProjectScanSourceModules } from '../transforms/project-scan';
import {
  publishNextDevelopmentStylesheet,
  startNextDevelopmentServer,
  stopNextDevelopmentServer,
} from './next-development-server';
import cssxNextLoader, { type CssxNextLoaderOptions } from './next-loader';

const nextExampleRoot = resolve(import.meta.dirname, '../../../../examples/next');
const importSource = '@cssxio/cssx';
const fsMocks = vi.hoisted(() => ({ failRename: false, failUnlink: false }));

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return {
    ...actual,
    rename: (...args: Parameters<typeof actual.rename>) =>
      fsMocks.failRename ? Promise.reject(new Error('atomic replace failed')) : actual.rename(...args),
    unlink: (...args: Parameters<typeof actual.unlink>) =>
      fsMocks.failUnlink ? Promise.reject(new Error('temporary cleanup failed')) : actual.unlink(...args),
  };
});

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
    expect(first.dependencies).not.toContain(linkedFile);
    expect(first.dependencies).toContain(themeFile);
    expect(first.contextDependencies).toContain(join(root, 'app'));
    expect(first.contextDependencies).toContain(linkedRoot);
    expect(consoleInfo).toHaveBeenCalledWith(expect.stringContaining('source naming'));
    await expect(stat(manifestPath)).rejects.toMatchObject({ code: 'ENOENT' });

    const second = await runLoader(layoutFile, layout, {
      ...settings,
      cssx: { ...settings.cssx, debug: { reportFile: '.cssx/debug/report.json' } },
    });
    await runLoader(layoutFile, layout, {
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

it('returns ignored generated files before transforming them', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-next-loader-ignored-'));
  const source = 'export const generated = true;';
  const inputMap = { version: 3 as const, sources: ['generated.ts'], names: [], mappings: '' };
  try {
    const result = await runLoader(
      join(root, '.next', 'cache.ts'),
      source,
      {
        projectRoot: root,
        styleSheetFile: join(root, '.cssx', 'next.css'),
        importSource,
        manifestPath: join(root, '.cssx', 'classes.json'),
        development: true,
        cssx: {},
      },
      inputMap,
    );

    expect(result.code).toBe(source);
    expect(result.map).toBe(inputMap);
    const noMap = await runLoader(join(root, '.next', 'cache.ts'), source, {
      projectRoot: root,
      styleSheetFile: join(root, '.cssx', 'next.css'),
      importSource,
      manifestPath: join(root, '.cssx', 'classes.json'),
      development: true,
      cssx: {},
    });
    expect(noMap.map).toBeUndefined();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

it('writes styles for a transformed non-root module when the cache is cold', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-next-loader-cold-cache-'));
  const pageFile = join(root, 'app', 'page.tsx');
  const source = `import { sx } from '${importSource}'; export const className = sx('p-4');`;
  const styleSheetFile = join(root, '.cssx', 'next.css');
  try {
    await mkdir(join(root, 'app'), { recursive: true });
    await writeFile(pageFile, source);

    await runLoader(pageFile, source, {
      projectRoot: root,
      styleSheetFile,
      importSource,
      manifestPath: join(root, '.cssx', 'classes.json'),
      development: true,
      cssx: { sourceMap: false, preflight: false },
    });

    await expect(readFile(styleSheetFile, 'utf8')).resolves.toContain('padding:calc(0.25rem * 4)');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

it('removes the temporary stylesheet when atomic replacement fails', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-next-loader-atomic-error-'));
  const layoutFile = join(root, 'app', 'layout.tsx');
  const styleSheetFile = join(root, '.cssx', 'next.css');
  const source = `import { sx } from '${importSource}'; export default function Layout() { return <html className={sx('p-4')} />; }`;
  try {
    fsMocks.failRename = true;
    await mkdir(join(root, 'app'), { recursive: true });
    await writeFile(layoutFile, source);
    await expect(
      runLoader(layoutFile, source, {
        projectRoot: root,
        styleSheetFile,
        importSource,
        manifestPath: join(root, '.cssx', 'classes.json'),
        development: true,
        cssx: { preflight: false },
      }),
    ).rejects.toThrow('atomic replace failed');
    await expect(readdir(join(root, '.cssx'))).resolves.toEqual([]);
  } finally {
    fsMocks.failRename = false;
    fsMocks.failUnlink = false;
    await rm(root, { recursive: true, force: true });
  }
});

it('preserves the stylesheet replacement error when temporary cleanup fails', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-next-loader-cleanup-error-'));
  const layoutFile = join(root, 'app', 'layout.tsx');
  const source = `import { sx } from '${importSource}'; export default function Layout() { return <html className={sx('p-4')} />; }`;
  try {
    fsMocks.failRename = true;
    fsMocks.failUnlink = true;
    await mkdir(join(root, 'app'), { recursive: true });
    await writeFile(layoutFile, source);
    await expect(
      runLoader(layoutFile, source, {
        projectRoot: root,
        styleSheetFile: join(root, '.cssx', 'next.css'),
        importSource,
        manifestPath: join(root, '.cssx', 'classes.json'),
        development: true,
        cssx: { preflight: false },
      }),
    ).rejects.toThrow('atomic replace failed');
  } finally {
    fsMocks.failRename = false;
    fsMocks.failUnlink = false;
    await rm(root, { recursive: true, force: true });
  }
});

it('surfaces filesystem errors when an existing debug report cannot be read', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-next-loader-debug-read-error-'));
  const layoutFile = join(root, 'app', 'layout.tsx');
  const reportPath = join(root, '.cssx', 'report.json');
  const source = 'export default function Layout() { return <html />; }';
  try {
    await mkdir(join(root, 'app'), { recursive: true });
    await writeFile(layoutFile, source);
    await mkdir(reportPath, { recursive: true });
    await expect(
      runLoader(layoutFile, source, {
        projectRoot: root,
        styleSheetFile: join(root, '.cssx', 'next.css'),
        importSource,
        manifestPath: join(root, '.cssx', 'classes.json'),
        development: false,
        cssx: { debug: { reportFile: '.cssx/report.json' }, preflight: false },
      }),
    ).rejects.toMatchObject({ code: 'EISDIR' });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

it('refreshes development styles from the root layout and honors inline themes', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-next-dev-'));
  const app = join(root, 'app');
  const layoutFile = join(app, 'layout.tsx');
  const pageFile = join(app, 'page.tsx');
  const styleSheetFile = join(root, '.cssx', 'next.css');
  const layoutSource = 'export default function Layout({ children }) { return <html><body>{children}</body></html>; }';
  const pageSource = `import { sx } from '${importSource}'; export const className = sx('p-4 bg-brand text-white');`;
  const settings: CssxNextLoaderOptions = {
    projectRoot: root,
    styleSheetFile,
    importSource,
    manifestPath: join(root, '.cssx', 'classnames.json'),
    development: true,
    cssx: { theme: '@theme reference { --color-brand: #171717; }', sourceMap: false, preflight: false },
  };
  try {
    await mkdir(app, { recursive: true });
    await writeFile(join(root, 'package.json'), '{}');
    await writeFile(layoutFile, layoutSource);
    await writeFile(pageFile, pageSource);

    const firstLayout = await runLoader(layoutFile, layoutSource, settings);
    const firstStyles = await readFile(styleSheetFile, 'utf8');
    expect(firstLayout.dependencies).not.toContain(pageFile);
    expect(firstStyles).toContain('--color-brand:#171717');
    const firstPage = await runLoader(pageFile, pageSource, settings);
    const firstPageData = getCachedProjectScanSourceModules(root, developmentPluginOptions(settings.cssx))?.find(
      (module) => module.id === canonicalPathSync(pageFile),
    );
    expect(firstPageData?.candidates['p-4']).not.toBe(firstPageData?.candidates['text-white']);

    const changedPage = pageSource.replace("sx('p-4 bg-brand text-white')", "sx('p-8 bg-brand text-white')");
    await writeFile(pageFile, changedPage);
    const changedModule = await runLoader(pageFile, changedPage, settings);
    expect(changedModule.code).not.toBe(changedPage);
    expect(changedModule.code.match(/d[a-z0-9]+/)?.[0]).toBe(firstPage.code.match(/d[a-z0-9]+/)?.[0]);
    expect(await readFile(styleSheetFile, 'utf8')).not.toBe(firstStyles);

    await runLoader(layoutFile, layoutSource, settings);
    expect(await readFile(styleSheetFile, 'utf8')).not.toBe(firstStyles);
    await expect(stat(`${styleSheetFile}.map`)).rejects.toMatchObject({ code: 'ENOENT' });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

it('injects the development stylesheet bridge only into transformed development modules', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-next-dev-bridge-'));
  const sourceFile = join(root, 'app', 'page.tsx');
  const source = `import { sx } from '${importSource}'; export const className = sx('p-4');`;
  const settings: CssxNextLoaderOptions = {
    projectRoot: root,
    styleSheetFile: join(root, '.cssx', 'next.css'),
    importSource,
    manifestPath: join(root, '.cssx', 'classnames.json'),
    development: true,
    developmentHmr: { port: 45678, token: 'bridge-test' },
    cssx: { sourceMap: false, preflight: false },
  };
  try {
    await mkdir(join(root, 'app'), { recursive: true });
    await writeFile(join(root, 'package.json'), '{}');
    await writeFile(sourceFile, source);

    const development = await runLoader(sourceFile, source, settings);
    const production = await runLoader(sourceFile, source, { ...settings, development: false });

    expect(development.code).toContain('EventSource');
    expect(development.code).toContain('http://127.0.0.1:45678/bridge-test');
    expect(production.code).not.toContain('EventSource');
    expect(production.code).not.toContain('__cssxDevelopmentStylesheetHmr');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

it('uses the ready coordinator stylesheet without scanning or watching project roots in the development layout loader', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-next-loader-coordinated-'));
  const layoutFile = join(root, 'app', 'layout.tsx');
  const pageFile = join(root, 'app', 'page.tsx');
  const styleSheetFile = join(root, '.cssx', 'next.css');
  const layoutSource = 'export default function Layout({ children }) { return <html><body>{children}</body></html>; }';
  const pageSource = `import { sx } from '${importSource}'; export const className = sx('p-4');`;
  let connection: ReturnType<typeof startNextDevelopmentServer> | undefined;

  try {
    await mkdir(join(root, 'app'), { recursive: true });
    await writeFile(layoutFile, layoutSource);
    await writeFile(pageFile, pageSource);
    await mkdir(join(root, '.cssx'), { recursive: true });
    await writeFile(styleSheetFile, '.dready{padding:1px;}');
    connection = startNextDevelopmentServer(root, styleSheetFile);
    await publishNextDevelopmentStylesheet(connection);

    const result = await runLoader(layoutFile, layoutSource, {
      projectRoot: root,
      styleSheetFile,
      importSource,
      manifestPath: join(root, '.cssx', 'classnames.json'),
      development: true,
      developmentHmr: connection,
      cssx: { sourceMap: false, preflight: false },
    });

    expect(result.code).toContain("import '../.cssx/next.css'");
    expect(result.contextDependencies).toEqual([]);
    expect(
      getCachedProjectScanSourceModules(root, developmentPluginOptions({ sourceMap: false, preflight: false })),
    ).toEqual([]);
  } finally {
    if (connection) {
      stopNextDevelopmentServer(root);
    }
    await rm(root, { recursive: true, force: true });
  }
});

it('compiles MDX source with source-addressed naming and appends input maps for plain modules', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cssx-next-mdx-loader-'));
  const sourceFile = join(root, 'content.mdx');
  const settings: CssxNextLoaderOptions = {
    projectRoot: root,
    styleSheetFile: join(root, '.cssx', 'generated.css'),
    importSource,
    manifestPath: join(root, '.cssx', 'classnames.json'),
    development: false,
    cssx: { naming: 'source', sourceMap: false, preflight: false },
  };
  try {
    await installFakeMdxCompiler(
      root,
      `import { sx } from '${importSource}'; export default function MDXContent() { return <div className={sx('p-4')}>MDX</div>; }`,
    );
    const mdx = await runLoader(
      sourceFile,
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
  } finally {
    await rm(root, { recursive: true, force: true });
  }
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

    await rm(join(root, 'pages'));
    const failingStylePath = join(root, 'block.css');
    await mkdir(failingStylePath);
    const layoutFile = join(root, 'app', 'layout.tsx');
    const layoutSource = `import { sx } from '${importSource}'; export default function Layout() { return <html className={sx('p-4')} />; }`;
    await writeFile(layoutFile, layoutSource);
    await expect(
      runLoader(layoutFile, layoutSource, {
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
