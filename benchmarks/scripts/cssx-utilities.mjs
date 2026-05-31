import { compileUtilities } from '@cssxio/compiler';
import './assert-compiler-build.mjs';
import { isDirectExecution, measure, printResults } from './shared.mjs';
import { validateCss } from './cssx.mjs';
import { createWorkload, readVariantArgument } from './workload.mjs';

/** Compiles pre-extracted utility candidates to final CSS without style-map composition. */
export async function runCssxUtilityBenchmark(variant = 'large') {
  const workload = createWorkload(variant);
  const candidates = [...new Set(workload.tailwindCandidates)];
  const classNames = Object.fromEntries(candidates.map((candidate, index) => [candidate, `u${index.toString(36)}`]));
  return measure(
    `CSSX pre-extracted utility compilation (${workload.variant})`,
    async () => ({
      js: '',
      css: (await compileUtilities(candidates, (candidate) => classNames[candidate] ?? '')).css,
    }),
    (artifacts) => validateCss(artifacts.css, workload),
  );
}

if (isDirectExecution(import.meta.url)) {
  const result = await runCssxUtilityBenchmark(readVariantArgument(process.argv.slice(2)));
  if (process.argv.includes('--json')) {
    process.stdout.write(JSON.stringify(result));
  } else {
    printResults([result]);
  }
}
