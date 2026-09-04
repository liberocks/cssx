import { bundleJavaScript, isDirectExecution, measure, printResults } from './shared.mjs';
import { createWorkload, readVariantArgument } from './workload.mjs';

/** Bundles styled-components' runtime-tagged definitions as delivered JavaScript. */
export async function runStyledComponentsBenchmark(variant = 'large') {
  const workload = createWorkload(variant);
  return measure(
    `styled-components final bundled build (${workload.variant})`,
    async () => ({ js: await bundleJavaScript(workload.styledComponentsSource), css: '' }),
    (artifacts) => validateStyledComponentsOutput(artifacts, workload),
  );
}

/** Ensures every component definition and its canonical styles survived bundling. */
function validateStyledComponentsOutput(artifacts, workload) {
  const compactJavaScript = artifacts.js.replaceAll(/\s+/g, '');
  if (Object.keys(workload.cssxStyleMap).length !== workload.componentCount) {
    throw new Error('styled-components benchmark has an incomplete component corpus.');
  }
  for (const component of workload.components) {
    if (!compactJavaScript.includes(`width:${component.stylex.width}`)) {
      throw new Error(`styled-components benchmark is missing width ${component.stylex.width}.`);
    }
  }
  if (!compactJavaScript.includes('display:inline-flex') || !compactJavaScript.includes('background-color:#3b82f6')) {
    throw new Error('styled-components benchmark is missing canonical style declarations.');
  }
}

if (isDirectExecution(import.meta.url)) {
  const result = await runStyledComponentsBenchmark(readVariantArgument(process.argv.slice(2)));
  if (process.argv.includes('--json')) {
    process.stdout.write(JSON.stringify(result));
  } else {
    printResults([result]);
  }
}
