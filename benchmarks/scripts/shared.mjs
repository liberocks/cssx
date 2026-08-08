import { gzipSync } from 'node:zlib';
import { build } from 'esbuild';

/** Number of measured runs after one warm-up run. */
export const ITERATIONS = 15;

/** Runs a benchmark and reports median elapsed time plus final artifact sizes. */
export async function measure(name, run, validate) {
  const warmupOutput = await run();
  validate(warmupOutput);
  const canonicalOutput = serializeArtifacts(warmupOutput);
  const samples = [];
  let output = warmupOutput;
  for (let index = 0; index < ITERATIONS; index++) {
    const started = performance.now();
    output = await run();
    samples.push(performance.now() - started);
    if (serializeArtifacts(output) !== canonicalOutput) {
      throw new Error(`${name} produced non-deterministic output.`);
    }
  }
  samples.sort((left, right) => left - right);
  const artifacts = artifactSizes(output);
  return {
    name,
    median: samples[Math.floor(samples.length / 2)] ?? 0,
    samples,
    ...artifacts,
  };
}

/** Prints benchmark results in the common table format. */
export function printResults(results) {
  console.table(
    results.map((result) => ({
      benchmark: result.name,
      'median ms': Number(result.median.toFixed(3)),
      'JS bytes': result.js.bytes,
      'CSS bytes': result.css.bytes,
      'total gzip bytes': result.gzip,
    })),
  );
}

/** Bundles and minifies JavaScript so every final-build artifact uses one optimizer. */
export async function bundleJavaScript(source) {
  const result = await build({
    stdin: {
      contents: source,
      sourcefile: 'components.js',
      resolveDir: process.cwd(),
    },
    bundle: true,
    format: 'esm',
    minify: true,
    write: false,
  });
  const output = result.outputFiles[0];
  if (!output) {
    throw new Error('Bundler produced no JavaScript output.');
  }
  return output.text;
}

/** Serializes named build artifacts in a stable form for equality checks. */
function serializeArtifacts(artifacts) {
  return JSON.stringify(artifacts);
}

/** Measures each artifact independently because applications serve them separately. */
function artifactSizes(artifacts) {
  const js = artifacts.js ?? '';
  const css = artifacts.css ?? '';
  return {
    js: { bytes: Buffer.byteLength(js), gzip: gzipSync(js).byteLength },
    css: { bytes: Buffer.byteLength(css), gzip: gzipSync(css).byteLength },
    gzip: gzipSync(js).byteLength + gzipSync(css).byteLength,
  };
}

/** Runs an individual benchmark when its module is executed directly. */
export function isDirectExecution(moduleUrl) {
  return process.argv[1] === new URL(moduleUrl).pathname;
}
