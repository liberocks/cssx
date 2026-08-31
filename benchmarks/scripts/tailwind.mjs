import { compile as compileTailwind } from 'tailwindcss';
import './assert-compiler-build.mjs';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { bundleCss, bundleJavaScript, isDirectExecution, measure, printResults } from './shared.mjs';
import { validateCss } from './cssx.mjs';
import { createWorkload, readVariantArgument } from './workload.mjs';

const require = createRequire(import.meta.url);
const tailwindCssPath = require.resolve('tailwindcss/utilities.css');
const tailwindCss = readFileSync(tailwindCssPath, 'utf8');

/** Compiles pre-extracted utility candidates to final CSS without the base reset. */
export async function runTailwindBenchmark(variant = 'large') {
  const workload = createWorkload(variant);
  const candidates = [...new Set(workload.tailwindCandidates)];
  return measure(
    `Tailwind final utility build (${workload.variant})`,
    async () => {
      const compiler = await compileTailwind('@import "tailwindcss/utilities.css" source(none);', {
        base: dirname(tailwindCssPath),
        loadStylesheet: async (id) => {
          if (id !== 'tailwindcss/utilities.css') {
            throw new Error(`Unexpected Tailwind stylesheet request: ${id}`);
          }
          return { content: tailwindCss, base: dirname(tailwindCssPath) };
        },
      });
      return { js: await bundleJavaScript(workload.tailwindSource), css: await bundleCss(compiler.build(candidates)) };
    },
    (artifacts) => validateCss(artifacts.css, workload),
  );
}

if (isDirectExecution(import.meta.url)) {
  const result = await runTailwindBenchmark(readVariantArgument(process.argv.slice(2)));
  if (process.argv.includes('--json')) {
    process.stdout.write(JSON.stringify(result));
  } else {
    printResults([result]);
  }
}
