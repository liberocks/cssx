import { transformSync } from '@babel/core';
import stylexPlugin from '@stylexjs/babel-plugin';
import './assert-compiler-build.mjs';
import { bundleJavaScript, isDirectExecution, measure, printResults } from './shared.mjs';
import { createWorkload, readVariantArgument } from './workload.mjs';
import { validateCss } from './cssx.mjs';

/** Transforms canonical source and processes final CSS with the StyleX production API. */
export async function runStylexBenchmark(variant = 'large') {
  const workload = createWorkload(variant);
  return measure(
    `StyleX final bundled build (${workload.variant})`,
    async () => {
      const result = transformSync(workload.stylexSource, {
        filename: 'components.js',
        babelrc: false,
        configFile: false,
        parserOpts: { sourceType: 'module' },
        plugins: [
          [
            stylexPlugin,
            {
              dev: false,
              runtimeInjection: false,
              treeshakeCompensation: true,
              unstable_moduleResolution: { type: 'commonJS' },
            },
          ],
        ],
      });
      if (!result?.code || !Array.isArray(result.metadata?.stylex)) {
        throw new Error('StyleX Babel transform returned incomplete output.');
      }
      return {
        js: await bundleJavaScript(result.code),
        css: stylexPlugin.processStylexRules(result.metadata.stylex),
      };
    },
    (artifacts) => validateCss(artifacts.css, workload),
  );
}

if (isDirectExecution(import.meta.url)) {
  const result = await runStylexBenchmark(readVariantArgument(process.argv.slice(2)));
  if (process.argv.includes('--json')) {
    process.stdout.write(JSON.stringify(result));
  } else {
    printResults([result]);
  }
}
