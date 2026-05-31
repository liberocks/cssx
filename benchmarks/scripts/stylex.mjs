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
