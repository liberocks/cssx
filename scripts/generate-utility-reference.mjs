import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { format, resolveConfig } from 'prettier';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const readmePath = path.join(root, 'README.md');
const readme = readFileSync(readmePath, 'utf8');
const prefixGroups = loadTypeScript(
  path.join(root, 'packages/compiler/src/utilities/registry/semantics-prefix-groups.ts'),
).PREFIX_GROUPS;
const exactGroups = loadTypeScript(
  path.join(root, 'packages/compiler/src/utilities/registry/semantics-exact-groups.ts'),
).EXACT_GROUPS;
const generated = [
  '<!-- cssx-utility-reference:start -->',
  '<details>',
  `<summary>Complete compiler class index: ${prefixGroups.length} value families and ${Object.keys(exactGroups).length} exact classes</summary>`,
  '',
  'The family prefixes below accept the value forms described in the utility sections above. The semantic group is the compiler write group used for conflict resolution and composition.',
  '',
  '#### Value-based utility class prefixes',
  '',
  '| Class prefix | Semantic group |',
  '| --- | --- |',
  ...prefixGroups.map(([prefix, group]) => `| \`${prefix}\` | \`${group}\` |`),
  '',
  '#### Exact utility classes',
  '',
  '| Class | Semantic group |',
  '| --- | --- |',
  ...Object.entries(exactGroups)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([className, metadata]) => `| \`${className}\` | \`${metadata.group}\` |`),
  '',
  '</details>',
  '<!-- cssx-utility-reference:end -->',
].join('\n');
const start = '<!-- cssx-utility-reference:start -->';
const end = '<!-- cssx-utility-reference:end -->';
const startIndex = readme.indexOf(start);
const endIndex = readme.indexOf(end);
if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
  throw new Error('README utility reference markers are missing or out of order.');
}
const updated = `${readme.slice(0, startIndex)}${generated}${readme.slice(endIndex + end.length)}`;
const prettierOptions = (await resolveConfig(readmePath)) ?? {};
const formatted = await format(updated, { ...prettierOptions, filepath: readmePath });
if (process.argv.includes('--check')) {
  if (formatted !== readme) {
    throw new Error('README utility reference is stale. Run pnpm generate:utility-reference.');
  }
} else {
  writeFileSync(readmePath, formatted);
}
process.stdout.write(
  `Utility reference contains ${prefixGroups.length} family prefixes and ${Object.keys(exactGroups).length} exact classes.\n`,
);

function loadTypeScript(filename) {
  const typescript = require('typescript');
  const source = readFileSync(filename, 'utf8');
  const output = typescript.transpileModule(source, {
    compilerOptions: { module: typescript.ModuleKind.CommonJS, target: typescript.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  const localRequire = (specifier) => {
    if (!specifier.startsWith('.')) {
      throw new Error(`Unsupported compiler registry dependency: ${specifier}`);
    }
    return loadTypeScript(path.resolve(path.dirname(filename), `${specifier}.ts`));
  };
  new Function('require', 'module', 'exports', output)(localRequire, module, module.exports);
  return module.exports;
}
