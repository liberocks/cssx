import { compile as compileTailwind } from 'tailwindcss';
import './assert-compiler-build.mjs';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { bundleJavaScript, isDirectExecution, measure, printResults } from './shared.mjs';
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
