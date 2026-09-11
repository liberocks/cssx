import { transformAsync } from '@babel/core';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = '/Volumes/Workspace/git/cssx';

const pluginPath =
  root + '/node_modules/.pnpm/@cssxio+babel-plugin@0.4.5_@babel+core@7.29.7/node_modules/@cssxio/babel-plugin/dist/index.js';
const compilerPath =
  root + '/node_modules/.pnpm/@cssxio+compiler@0.6.0/node_modules/@cssxio/compiler/dist/index.js';

const plugin = await import(pluginPath).then((m) => m.default ?? m);
const compiler = await import(compilerPathapsed);
const { compileCssxStylesheet: compile } = compiler;

const code = readFileSync(join(root, 'packages/docs/src/pages/index.astro'), 'utf8');

const theme = String.raw`
@theme reference {
  --color-brand: #3245ff;
  --font-display: ui-rounded, "Avenir Next", "Segoe UI", sans-serif;
}
`;

const alloc = compiler.createClassNameAllocator();

const meta = {};

try {
  const out = await transformAsync(code, {
    babelrc: false,
    configFile: false,
    filename: 'index.astro',
    parserOpts: { plugins: ['jsx', 'typescript'] },
    plugins: [
      [
        plugin,
        {
          importSource: '@cssxio/cssx',
          classNameAllocator: alloc,
          theme,
          darkMode: 'selector',
        },
      ],
    ],
  });
  const g = out.metadata.cssx;
  meta.candidates = g.candidates;
  meta.composites = g.composites;
  meta.atomicClasses = g.atomicClasses;
} catch (e) {
  console.log('TRANSFORM-ERROR');
  console.log(String(e && e.message).slice(0, 900));
  process.exit(0);
}

const mk = Object.keys(meta.candidates);
const stylesheet = await compile(
  [{ id: '/index.astro', code, candidates: meta.candidates, composites: meta.composites, atomicClasses: meta.atomicClasses }],
  undefined,
  undefined,
  false,
  'selector',
  false,
);

const css = stylesheet.css;
const i = css.indexOf('data-theme=dark');
console.log('===== RESULT =====');
console.log('selector-emitted:', i >= 0);
console.log('media-emitted:', css.includes('prefers-color-scheme'));
if (i >= 0) console.log('sample:', JSON.stringify(css.slice(i - 14, i + 42)));
console.log('css-bytes:', css.length);
