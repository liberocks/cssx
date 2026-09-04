import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const frameworkRunner = fileURLToPath(new URL('../scripts/start-framework.mjs', import.meta.url));

/** @typedef {'development' | 'production'} VisualMode */

const definitions = {
  astro: { port: 4311 },
  gatsby: { port: 4312 },
  next: { port: 4313 },
  react: { port: 4314 },
  vite: { port: 4315 },
  remix: { port: 4316 },
  solid: { port: 4317 },
};

export const frameworks = Object.freeze(Object.keys(definitions));

/** Returns one framework definition after validating its requested mode. */
export function frameworkDefinition(framework, mode) {
  const definition = definitions[framework];
  if (!definition || (mode !== 'development' && mode !== 'production')) {
    throw new Error(`Unknown CSSX visual test target: ${framework}/${mode}`);
  }
  return definition;
}

/** Returns the isolated web-server configuration for one fixture and mode. */
export function frameworkServer(framework, mode) {
  const definition = frameworkDefinition(framework, mode);
  return {
    cwd: root,
    command: `"${process.execPath}" "${frameworkRunner}" ${framework} ${mode}`,
    url: `http://127.0.0.1:${definition.port}`,
  };
}
