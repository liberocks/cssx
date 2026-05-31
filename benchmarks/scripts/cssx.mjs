import { transformSync } from '@babel/core';
import cssxPlugin from '../../packages/babel-plugin/dist/index.js';
import { compileUtilities, createSelectorAliases } from '@cssxio/compiler';
import './assert-compiler-build.mjs';
import { bundleJavaScript, isDirectExecution, measure, printResults } from './shared.mjs';
import { createWorkload, readVariantArgument } from './workload.mjs';

const SERIAL_CLASS_NAME = /^s[0-9A-Za-z]+x$/;

/** Transforms canonical source and extracts final CSS with CSSX's production pipeline. */
export async function runCssxBenchmark(variant = 'large') {
  const workload = createWorkload(variant);
  return measure(
    `CSSX final bundled build (${workload.variant})`,
    async () => {
      const result = transformSync(workload.cssxSource, {
        babelrc: false,
        configFile: false,
        filename: 'components.js',
        parserOpts: { sourceType: 'module' },
        plugins: [cssxPlugin],
      });
      if (!result?.code) {
        throw new Error('CSSX Babel transform returned no code.');
      }
      const metadata = result.metadata.cssx ?? {};
      const candidates = metadata.candidates ?? {};
      const compiled = await compileUtilities(
        Object.keys(candidates),
        (candidate) => candidates[candidate] ?? candidate,
        '',
        createSelectorAliases(metadata.composites ?? {}),
        new Set(metadata.atomicClasses ?? []),
      );
      return { js: await bundleJavaScript(result.code), css: compiled.css };
    },
    (artifacts) => validateCssxOutput(artifacts, workload),
  );
}

/** Rejects missing transforms, missing styles, and non-default generated names. */
function validateCssxOutput(artifacts, workload) {
  const classValues = [...artifacts.js.matchAll(/className:\s*"([^"]+)"/g)].map((match) => match[1] ?? '');
  const classNames = classValues.flatMap((classValue) => classValue.split(' '));
  if (
    classValues.length !== workload.componentCount ||
    classNames.some((className) => !SERIAL_CLASS_NAME.test(className))
  ) {
    throw new Error('CSSX benchmark requires default s…x serial class names.');
  }
  validateCss(artifacts.css, workload);
}

/** Checks final CSS contains every canonical per-component declaration. */
export function validateCss(css, workload) {
