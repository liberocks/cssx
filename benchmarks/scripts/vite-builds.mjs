import { execFile } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { dirname, extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const gzipOptions = Object.freeze({ level: 6 });
const projects = [
  { name: 'CSSX', directory: 'cssx', stylesheet: 'cssx.css' },
  { name: 'Tailwind', directory: 'tailwind' },
  { name: 'styled-components', directory: 'styled-components' },
  { name: 'StyleX', directory: 'stylex' },
];

const results = [];
for (const project of projects) {
  results.push(await buildProject(project));
}

console.log('Vite initial-route build size');
console.table(
  results.map((result) => ({
    Framework: result.name,
    'Build time': `${result.duration.toFixed(0)} ms`,
    'Delivered gzip': `${result.gzip.toLocaleString()} B`,
    'JS gzip': `${result.js.gzip.toLocaleString()} B`,
    'CSS gzip': `${result.css.gzip.toLocaleString()} B`,
  })),
);

async function buildProject(project) {
  const directory = resolve(root, project.directory);
  return { name: project.name, ...(await buildAndInspect(project, directory)) };
}

async function buildAndInspect(project, directory) {
  const started = performance.now();
  await run('pnpm', ['--dir', directory, 'run', 'build']);
  const duration = performance.now() - started;
  const dist = resolve(directory, 'dist');
  const manifestPath = resolve(dist, '.vite/manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const initialFiles = initialRouteFiles(manifest);

  const html = await readFile(resolve(dist, 'index.html'), 'utf8');
  if (project.stylesheet) {
    if (!html.includes(`href="/${project.stylesheet}"`)) {
      throw new Error(`${project.name} build does not link ${project.stylesheet} from index.html.`);
    }
    initialFiles.add(project.stylesheet);
  }

  const outputFiles = await filesIn(dist);
  const deliveryAssets = outputFiles.filter((file) => /\.(?:css|js)$/.test(file));
  const unexpectedAssets = deliveryAssets.filter((file) => !initialFiles.has(file));
  if (unexpectedAssets.length > 0) {
    throw new Error(`${project.name} emitted non-initial assets: ${unexpectedAssets.join(', ')}.`);
  }

  const assets = await Promise.all(
    [...initialFiles].sort().map(async (file) => ({ file, source: await readFile(resolve(dist, file)) })),
  );
  const js = summarize(assets.filter(({ file }) => extname(file) === '.js'));
  const css = summarize(assets.filter(({ file }) => extname(file) === '.css'));
  if (js.bytes === 0 || css.bytes === 0) {
    throw new Error(`${project.name} must emit non-empty JavaScript and CSS initial-route assets.`);
  }
  return { duration, js, css, gzip: js.gzip + css.gzip };
}

function initialRouteFiles(manifest) {
  const entry = manifest['index.html'];
  if (!entry?.file) {
    throw new Error('Vite manifest is missing the index.html entry.');
  }
  const files = new Set();
  const visit = (name) => {
    const chunk = manifest[name];
    if (!chunk || files.has(chunk.file)) return;
    files.add(chunk.file);
    for (const css of chunk.css ?? []) files.add(css);
    for (const imported of chunk.imports ?? []) visit(imported);
  };
  visit('index.html');
  return files;
}

function summarize(assets) {
  return assets.reduce(
    (total, { source }) => ({
      bytes: total.bytes + source.byteLength,
      gzip: total.gzip + gzipSync(source, gzipOptions).byteLength,
    }),
    { bytes: 0, gzip: 0 },
  );
}

async function filesIn(directory, base = directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) return filesIn(path, base);
      return [relative(base, path)];
    }),
  );
  return files.flat();
}

function run(command, argumentsList) {
  return new Promise((resolvePromise, reject) => {
    execFile(command, argumentsList, { cwd: root }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || stdout || error.message));
        return;
      }
      resolvePromise();
    });
  });
}
