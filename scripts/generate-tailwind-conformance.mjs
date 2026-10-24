import { execFileSync } from 'node:child_process';
import { mkdir, readdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import prettier from 'prettier';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tailwindMajorVersion = 4;
const pinnedCommit = 'c2b24dd15fed1c59dd521bd86082f520c9f5ad0d';
const tailwindRoot = path.join(root, 'experiments', 'tailwindcss');
const snapshotPath = path.join(
  tailwindRoot,
  'packages',
  'tailwindcss',
  'src',
  '__snapshots__',
  'intellisense.test.ts.snap',
);
const packagePath = path.join(tailwindRoot, 'packages', 'tailwindcss', 'package.json');
const themePath = path.join(tailwindRoot, 'packages', 'tailwindcss', 'theme.css');
const fixturePath = path.join(root, 'packages', 'compiler', 'src', 'fixtures', 'corpus.json');
const fallbackOutputDirectory = path.join(root, 'packages', 'compiler', 'src', 'generated');
const corpusPartsDirectory = path.join(path.dirname(fixturePath), 'corpus');
const themeOutputPath = path.join(fallbackOutputDirectory, 'theme-defaults.generated.ts');

const [snapshot, tailwindPackage, themeCss] = await Promise.all([
  readFile(snapshotPath, 'utf8'),
  readFile(packagePath, 'utf8').then(JSON.parse),
  readFile(themePath, 'utf8'),
]);
const commit = execFileSync('git', ['-C', tailwindRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (commit !== pinnedCommit || tailwindPackage.version !== '4.3.3') {
  throw new Error(`Expected Tailwind 4.3.3 at ${pinnedCommit}, found ${tailwindPackage.version} at ${commit}.`);
}

const match = /exports\[`getClassList 1`\] = `\n\[\n([\s\S]*?)\n\]\n`;/.exec(snapshot);
if (!match) throw new Error(`Could not locate the getClassList snapshot in ${snapshotPath}.`);
const candidates = match[1]
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line.startsWith('"'))
  .map((line) => JSON.parse(line.replace(/,$/, '')));

const compiler = await loadPinnedCompiler();
const css = compiler.build(candidates);
const fallbacks = Object.fromEntries(
  candidates.map((candidate) => {
    const fallback = extractCandidateCss(css, candidate);
    return [
      candidate,
      {
        ...fallback,
        css: fallback.css.replaceAll('--tw-', '--cx-'),
        group: fallback.group.replaceAll('--tw-', '--cx-'),
      },
    ];
  }),
);
const defaultTheme = parseTheme(themeCss);
const source = {
  repository: 'https://github.com/tailwindlabs/tailwindcss',
  major: tailwindMajorVersion,
  version: tailwindPackage.version,
  commit,
  snapshot: 'packages/tailwindcss/src/__snapshots__/intellisense.test.ts.snap#getClassList-1',
};

await mkdir(fallbackOutputDirectory, { recursive: true });
await mkdir(corpusPartsDirectory, { recursive: true });
const fallbackEntries = Object.entries(fallbacks);
const fallbackChunks = chunk(fallbackEntries, 200);
for (const entry of await readdir(fallbackOutputDirectory, { withFileTypes: true })) {
  if (entry.isFile() && /^fallback-\d{3}\.generated\.ts$/.test(entry.name)) {
    await unlink(path.join(fallbackOutputDirectory, entry.name));
  }
}
for (const entry of await readdir(corpusPartsDirectory, { withFileTypes: true })) {
  if (entry.isFile() && /^part-\d{3}\.json$/.test(entry.name)) {
    await unlink(path.join(corpusPartsDirectory, entry.name));
  }
}

const fallbackImports = [];
for (const [index, entries] of fallbackChunks.entries()) {
  const name = `fallback-${String(index).padStart(3, '0')}.generated.ts`;
  const exportName = `UTILITY_FALLBACKS_${String(index).padStart(3, '0')}`;
  fallbackImports.push(`import { ${exportName} } from './${name.replace(/\.ts$/, '')}';`);
  const rows = entries
    .map(([candidate, fallback]) => `  ${JSON.stringify(candidate)}: ${JSON.stringify(fallback)},`)
    .join('\n');
  await writeFormatted(
    path.join(fallbackOutputDirectory, name),
    `import type { UtilityFallback } from '../utilities/registry/fallback';\n\n/** Generated fallback shard ${index + 1} of ${fallbackChunks.length}. */\nexport const ${exportName}: Readonly<Record<string, UtilityFallback>> = Object.freeze({\n${rows}\n});\n`,
  );
}
await writeFormatted(
  path.join(fallbackOutputDirectory, 'fallback.generated.ts'),
  `import type { UtilityFallback } from '../utilities/registry/fallback';\n${fallbackImports.join('\n')}\n\n/** Generated index for checked-in utility fallback shards. */\nexport const UTILITY_FALLBACKS: Readonly<Record<string, UtilityFallback>> = Object.freeze(\n  Object.assign({}, ${fallbackChunks.map((_, index) => `UTILITY_FALLBACKS_${String(index).padStart(3, '0')}`).join(', ')}),\n);\n`,
);

const corpusChunks = chunk(candidates, 300);
const corpusParts = corpusChunks.map((_, index) => `part-${String(index).padStart(3, '0')}.json`);
for (const [index, entries] of corpusChunks.entries()) {
  await writeFormatted(path.join(corpusPartsDirectory, corpusParts[index]), `${JSON.stringify(entries, null, 2)}\n`);
}
await writeFormatted(
  fixturePath,
  `${JSON.stringify({ source, total: candidates.length, parts: corpusParts }, null, 2)}\n`,
);
const defaultThemeRows = Object.entries(defaultTheme)
  .map(([name, value]) => `  '${name}': ${JSON.stringify(value)},`)
  .join('\n');
await writeFormatted(
  themeOutputPath,
  `/** Generated from the pinned upstream theme.css. */\nexport const DEFAULT_THEME: Readonly<Record<string, string>> = Object.freeze({\n${defaultThemeRows}\n});\n`,
);
console.log(
  `Wrote ${path.relative(root, fixturePath)} (${candidates.length} candidates in ${corpusChunks.length} parts) and ${fallbackChunks.length} fallback shards.`,
);

/** Divides generated records into stable-size output files.
 * @template T
 * @param {readonly T[]} values
 * @param {number} size
 * @returns {T[][]}
 */
function chunk(values, size) {
  const chunks = [];
  for (let index = 0; index < values.length; index += size) chunks.push(values.slice(index, index + size));
  return chunks;
}

/** Writes generated source using the repository's formatting rules. */
async function writeFormatted(filePath, source) {
  const options = (await prettier.resolveConfig(filePath)) ?? {};
  await writeFile(filePath, await prettier.format(source, { ...options, filepath: filePath }));
}

/** Loads the verified development-only Tailwind compiler used as the oracle. */
async function loadPinnedCompiler() {
  const pnpmRoot = path.join(root, 'node_modules', '.pnpm');
  const entries = await readdir(pnpmRoot);
  const packageDir = entries.find((entry) => entry === 'tailwindcss@4.3.3');
  if (!packageDir)
    throw new Error('Install workspace development dependencies before generating the Tailwind fixture.');
  const packageRoot = path.join(pnpmRoot, packageDir, 'node_modules', 'tailwindcss');
  const packageJson = JSON.parse(await readFile(path.join(packageRoot, 'package.json'), 'utf8'));
  if (packageJson.version !== '4.3.3')
    throw new Error(`Expected installed Tailwind 4.3.3, found ${packageJson.version}.`);
  const { compile } = await import(pathToFileURL(path.join(packageRoot, 'dist', 'lib.mjs')).href);
  return compile('@import "tailwindcss";', {
    loadStylesheet: async (id) => ({
      path: id,
      base: '',
      content: await readFile(path.join(packageRoot, id === 'tailwindcss' ? 'index.css' : id), 'utf8'),
    }),
  });
}

/** Extracts Tailwind `@theme` declarations into CSSX's checked-in token map. */
function parseTheme(sourceCss) {
  return Object.fromEntries(
    [...sourceCss.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)].map(([, name, value]) => [
      name,
      value.replace(/\s+/g, ' ').trim(),
    ]),
  );
}

/** Isolates the rule emitted for one exact snapshot candidate. */
function extractCandidateCss(sourceCss, candidate) {
  const selector = `.${escapeCssIdentifier(candidate)}`;
  const index = findExactSelector(sourceCss, selector);
  if (index === -1) return { css: '', group: 'fallback-noop' };
  const open = sourceCss.indexOf('{', index);
  const close = matchingBrace(sourceCss, open);
  let headerStart = sourceCss.lastIndexOf('}', index) + 1;
  headerStart = Math.max(headerStart, sourceCss.lastIndexOf('{', index) + 1);
  const header = sourceCss.slice(headerStart, open).trim();
  const selectors = splitSelectors(header).filter((value) => value.includes(selector));
  if (!selectors.length) throw new Error(`Could not isolate Tailwind selector for ${candidate}.`);
  const declarations = sourceCss.slice(open + 1, close).trim();
  return { css: `${selectors.join(',')}{${declarations}}`, group: declarationGroup(declarations) };
}

/** Finds a selector token without confusing it with a longer utility name. */
function findExactSelector(source, selector) {
  let index = source.indexOf(selector);
  while (index !== -1) {
    const next = source[index + selector.length] ?? '';
    if (!/[a-z0-9_-]/i.test(next) && next !== '\\') return index;
    index = source.indexOf(selector, index + selector.length);
  }
  return -1;
}

/** Finds the closing brace paired with an opening CSS rule brace. */
function matchingBrace(source, open) {
  let depth = 0;
  for (let index = open; index < source.length; index++) {
    if (source[index] === '{') depth++;
    if (source[index] === '}' && --depth === 0) return index;
  }
  throw new Error('Unbalanced Tailwind CSS output.');
}

/** Splits a selector list without splitting commas nested in brackets or functions. */
function splitSelectors(value) {
  const selectors = [];
  let current = '';
  let depth = 0;
  for (const character of value) {
    if (character === '(' || character === '[') depth++;
    if (character === ')' || character === ']') depth--;
    if (character === ',' && depth === 0) {
      selectors.push(current.trim());
      current = '';
    } else current += character;
  }
  selectors.push(current.trim());
  return selectors;
}

/** Produces a conservative merge group from the first declaration in an oracle rule. */
function declarationGroup(value) {
  const property = /(?:^|[;{])\s*(--[a-z0-9-]+|[a-z-]+)\s*:/i.exec(value)?.[1];
  return property ? `fallback-${property}` : 'fallback-utility';
}

/** Escapes a utility string for exact matching in Tailwind's generated CSS. */
function escapeCssIdentifier(value) {
  let output = '';
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index);
    const character = value[index];
    if (index === 0 && code >= 48 && code <= 57) output += `\\${code.toString(16)} `;
    else if (
      code >= 128 ||
      code === 45 ||
      code === 95 ||
      (code >= 48 && code <= 57) ||
      (code >= 65 && code <= 90) ||
      (code >= 97 && code <= 122)
    )
      output += character;
    else output += `\\${character}`;
  }
  return output;
}
