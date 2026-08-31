import { transformSync } from '@babel/core';
import cssxPlugin from '../../packages/babel-plugin/dist/index.js';
import { compileUtilities, createSelectorAliases } from '@cssxio/compiler';
import './assert-compiler-build.mjs';
import { bundleCss, bundleJavaScript, isDirectExecution, measure, printResults } from './shared.mjs';
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
      return { js: await bundleJavaScript(result.code), css: await bundleCss(compiled.css) };
    },
    (artifacts) => validateCssxOutput(artifacts, workload),
  );
}

/** Rejects missing transforms, missing styles, and non-default generated names. */
async function validateCssxOutput(artifacts, workload) {
  const module = await import(`data:text/javascript;base64,${Buffer.from(artifacts.js).toString('base64')}`);
  const classValues = Object.values(module.props ?? {}).map((value) => value?.className ?? '');
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
  if (!css) {
    throw new Error('Benchmark CSS must not be empty.');
  }
  const compactCss = css.replaceAll(/\s+/g, '');
  for (const component of workload.components) {
    const width = component.stylex.width;
    if (!compactCss.includes(`width:${width}`)) {
      throw new Error(`Benchmark CSS is missing width ${width}.`);
    }
  }
  for (const declaration of [
    'display:inline-flex',
    'line-height:1.25rem',
    'font-weight:600',
    'color:#fff',
    'padding-left:',
    'padding-right:',
  ]) {
    if (!compactCss.includes(declaration)) {
      throw new Error(`Benchmark CSS is missing ${declaration}.`);
    }
  }
  for (const color of new Set(workload.components.map((component) => component.stylex.backgroundColor))) {
    if (!compactCss.includes(`background-color:${color}`)) {
      throw new Error(`Benchmark CSS is missing background color ${color}.`);
    }
  }
}

if (isDirectExecution(import.meta.url)) {
  const result = await runCssxBenchmark(readVariantArgument(process.argv.slice(2)));
  if (process.argv.includes('--json')) {
    process.stdout.write(JSON.stringify(result));
  } else {
    printResults([result]);
  }
}
