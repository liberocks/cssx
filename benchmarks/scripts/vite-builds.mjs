import { execFile } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const gzipOptions = Object.freeze({ level: 6 });
const projects = [
  { name: 'CSSX native', directory: 'cssx', stylesheet: 'cssx.css', native: true },
  { name: 'CSSX Babel fallback', directory: 'cssx', stylesheet: 'cssx.css', native: false },
  { name: 'Tailwind', directory: 'tailwind' },
  { name: 'styled-components', directory: 'styled-components' },
  { name: 'StyleX', directory: 'stylex' },
];
const measuredBuilds = 5;

const results = [];
for (const project of projects) {
  results.push(await buildProject(project));
}

console.log('Vite initial-route build size');
console.table(
  results.map((result) => ({
    Framework: result.name,
    'Warm build median': `${result.duration.toFixed(0)} ms`,
    'Warm build range': `${(result.samples[0] ?? 0).toFixed(0)}–${(result.samples.at(-1) ?? 0).toFixed(0)} ms`,
    'Delivered gzip': `${result.gzip.toLocaleString()} B`,
    'JS gzip': `${result.js.gzip.toLocaleString()} B`,
    'CSS gzip': `${result.css.gzip.toLocaleString()} B`,
  })),
);

async function buildProject(project) {
  const directory = resolve(root, project.directory);
  const environment =
    project.native === undefined ? undefined : { CSSX_DISABLE_NATIVE_COMPILER: project.native ? '0' : '1' };
  await run(process.execPath, [resolve(root, 'scripts/generate-vite-corpus.mjs'), project.directory], directory);
  await buildProjectOnce(directory, environment);
  const samples = [];
  for (let index = 0; index < measuredBuilds; index += 1) {
    const started = performance.now();
    await buildProjectOnce(directory, environment);
    samples.push(performance.now() - started);
  }
  samples.sort((left, right) => left - right);
  const duration = samples[Math.floor(samples.length / 2)] ?? 0;
  return { name: project.name, duration, samples, ...(await inspectBuild(project, directory)) };
}

async function buildProjectOnce(directory, environment) {
  await run(process.execPath, [resolve(directory, 'node_modules/vite/bin/vite.js'), 'build'], directory, environment);
}

async function inspectBuild(project, directory) {
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
  return { js, css, gzip: js.gzip + css.gzip };
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

function run(command, argumentsList, cwd = root, environment) {
  return new Promise((resolvePromise, reject) => {
    execFile(
      command,
      argumentsList,
      { cwd, ...(environment ? { env: { ...process.env, ...environment } } : {}) },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr || stdout || error.message));
          return;
        }
        resolvePromise();
      },
    );
  });
}
