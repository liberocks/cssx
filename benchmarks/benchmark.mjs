import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { printResults } from './scripts/shared.mjs';
import { WORKLOAD_VARIANT_NAMES, createWorkload, readVariantArgument } from './scripts/workload.mjs';

const TRIALS = 6;
const runners = [
  { framework: 'CSSX', suite: 'Final bundled output', path: './scripts/cssx.mjs' },
  { framework: 'Tailwind', suite: 'Final bundled output', path: './scripts/tailwind.mjs' },
  { framework: 'styled-components', suite: 'Final bundled output', path: './scripts/styled-components.mjs' },
  { framework: 'StyleX', suite: 'Final bundled output', path: './scripts/stylex.mjs' },
];
const selectedVariant = readVariantArgument(process.argv.slice(2));
const variants = selectedVariant ? [createWorkload(selectedVariant).variant] : WORKLOAD_VARIANT_NAMES;
const finalBuildRows = [];

for (const variant of variants) {
  const workload = createWorkload(variant);
  console.log(
    `\n${workload.variant}: ${workload.componentCount} components, ${workload.utilityOccurrences} declarations`,
  );
  const results = new Map(runners.map((runner) => [runner.path, []]));
  for (let trial = 0; trial < TRIALS; trial++) {
    // Rotate runner order so persistent machine state is not coupled to one framework.
    const ordered = [...runners.slice(trial % runners.length), ...runners.slice(0, trial % runners.length)];
    for (const runner of ordered) {
      results.get(runner.path)?.push(await runInChild(runner.path, variant));
    }
  }
  const summaries = new Map(runners.map((runner) => [runner.path, summarize(results.get(runner.path) ?? [])]));
  for (const suite of new Set(runners.map((runner) => runner.suite))) {
    console.log(suite);
    printResults(runners.filter((runner) => runner.suite === suite).map((runner) => summaries.get(runner.path)));
  }
  for (const runner of runners) {
    const result = summaries.get(runner.path);
    if (!result) {
      throw new Error(`Missing benchmark summary for ${runner.framework}.`);
    }
    finalBuildRows.push({
      Scale: `${capitalize(workload.variant)} (${workload.componentCount.toLocaleString()})`,
      Framework: runner.framework,
      Median: `${result.median.toFixed(3)} ms`,
      'Raw output': `${(result.js.bytes + result.css.bytes).toLocaleString()} B`,
      'JS / CSS gzip': `${result.js.gzip.toLocaleString()} / ${result.css.gzip.toLocaleString()} B`,
      Gzip: `${result.gzip.toLocaleString()} B`,
    });
  }
}

console.log('Final build size summary');
console.table(finalBuildRows);

function runInChild(path, variant) {
  return new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      [fileURLToPath(new URL(path, import.meta.url)), variant, '--json'],
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr || error.message));
          return;
        }
        try {
          resolve(JSON.parse(stdout));
        } catch {
          reject(new Error(`Benchmark runner returned invalid JSON: ${stdout}`));
        }
      },
    );
  });
}

function summarize(results) {
  const first = results[0];
  if (!first) {
    throw new Error('Benchmark runner produced no trials.');
  }
  if (results.some((result) => result.js.bytes !== first.js.bytes || result.css.bytes !== first.css.bytes)) {
    throw new Error(`${first.name} produced non-deterministic artifacts across processes.`);
  }
  const samples = results.flatMap((result) => result.samples).sort((left, right) => left - right);
  return { ...first, median: samples[Math.floor(samples.length / 2)] ?? 0, samples };
}

function capitalize(value) {
  return value[0]?.toUpperCase() + value.slice(1);
}
