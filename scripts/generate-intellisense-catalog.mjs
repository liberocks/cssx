import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const typescript = require('typescript');
const extensionData = require(path.join(root, 'packages/intellisense/src/catalog-data.js'));
const corpus = JSON.parse(readFileSync(path.join(root, 'packages/compiler/src/fixtures/corpus.json'), 'utf8'));
const theme = loadTypeScript(path.join(root, 'packages/compiler/src/theme/theme-defaults.ts')).DEFAULT_THEME;
const colors = Object.fromEntries(
  Object.entries(theme)
    .filter(([name]) => name.startsWith('--color-'))
    .map(([name, value]) => [name.slice('--color-'.length), toHex(value)])
    .filter(([, hex]) => hex),
);
const candidates = new Set([...corpus.candidates, ...extensionData.EXACT]);
const unsupportedThemeUtilities = new Set([
  'rounded-xs',
  'rounded-3xl',
  'rounded-4xl',
  'shadow-2xs',
  'shadow-inner',
  'shadow-xs',
]);

for (const utility of Object.keys({
  accent: '--color-',
  bg: '--color-',
  border: '--color-',
  'border-be': '--color-',
  'border-bs': '--color-',
  'border-x': '--color-',
  'border-y': '--color-',
  'border-t': '--color-',
  'border-r': '--color-',
  'border-b': '--color-',
  'border-l': '--color-',
  'border-s': '--color-',
  'border-e': '--color-',
  caret: '--color-',
  decoration: '--color-',
  divide: '--color-',
  fill: '--color-',
  from: '--color-',
  outline: '--color-',
  placeholder: '--color-',
  ring: '--color-',
  'ring-offset': '--color-',
  'scrollbar-thumb': '--color-',
  'scrollbar-track': '--color-',
  stroke: '--color-',
  text: '--color-',
  via: '--color-',
  to: '--color-',
})) {
  for (const name of Object.keys(colors)) candidates.add(`${utility}-${name}`);
}

for (const name of Object.keys(theme)) {
  const token = name.slice(2);
  const output = [
    [/^text-/, 'text'],
    [/^font-weight-/, 'font'],
    [/^font-/, 'font'],
    [/^leading-/, 'leading'],
    [/^tracking-/, 'tracking'],
    [/^radius-/, 'rounded'],
    [/^shadow-/, 'shadow'],
    [/^duration-/, 'duration'],
    [/^delay-/, 'delay'],
    [/^ease-/, 'ease'],
    [/^animate-/, 'animate'],
    [/^stagger-/, 'stagger'],
  ].find(([pattern]) => pattern.test(token));
  if (output) {
    const suffix = token.replace(output[0], '');
    const candidate = `${output[1]}-${suffix}`;
    if (suffix && !suffix.includes('--') && !unsupportedThemeUtilities.has(candidate)) candidates.add(candidate);
  }
  if (name.startsWith('--breakpoint-')) candidates.add(`${token.slice('breakpoint-'.length)}:`);
}

const sortedCandidates = [...candidates].sort();
const outputPath = path.join(root, 'packages/intellisense/catalog-generated.json');
const output = `${JSON.stringify({ source: corpus.source, candidates: sortedCandidates, colors }, null, 2)}\n`;
if (process.argv.includes('--check')) {
  if (readFileSync(outputPath, 'utf8') !== output) {
    throw new Error('The IntelliSense catalog is stale. Run pnpm generate:intellisense-catalog.');
  }
} else {
  writeFileSync(outputPath, output);
}
console.log(
  `Wrote ${sortedCandidates.length} candidates and ${Object.keys(colors).length} colors to ${path.relative(root, outputPath)}.`,
);

function loadTypeScript(filename) {
  const source = readFileSync(filename, 'utf8');
  const output = typescript.transpileModule(source, {
    compilerOptions: { module: typescript.ModuleKind.CommonJS, target: typescript.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  const localRequire = (specifier) => {
    if (!specifier.startsWith('.')) throw new Error(`Unsupported theme dependency: ${specifier}`);
    return loadTypeScript(path.resolve(path.dirname(filename), `${specifier}.ts`));
  };
  new Function('require', 'module', 'exports', output)(localRequire, module, module.exports);
  return module.exports;
}

function toHex(value) {
  const hex = /^#([\da-f]{3,8})$/i.exec(value)?.[1];
  if (hex) {
    if (hex.length === 3 || hex.length === 4) return `#${[...hex].map((digit) => `${digit}${digit}`).join('')}`;
    if (hex.length === 6 || hex.length === 8) return `#${hex.toLowerCase()}`;
  }
  if (value === 'transparent') return '#00000000';
  const match = /^oklch\(\s*([\d.]+)%?\s+([\d.]+)\s+([\d.]+)(?:deg)?\s*\)$/i.exec(value);
  if (!match) return null;

  const lightness = Number(match[1]) / (value.includes('%') ? 100 : 1);
  const chroma = Number(match[2]);
  const hue = (Number(match[3]) * Math.PI) / 180;
  const a = chroma * Math.cos(hue);
  const b = chroma * Math.sin(hue);
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const channels = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return `#${channels
    .map((channel) =>
      Math.round(255 * gamma(Math.min(1, Math.max(0, channel))))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

function gamma(channel) {
  return channel <= 0.0031308 ? channel * 12.92 : 1.055 * channel ** (1 / 2.4) - 0.055;
}
