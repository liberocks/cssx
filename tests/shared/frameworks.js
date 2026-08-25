import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const examples = resolve(root, 'examples');

/** @typedef {'development' | 'production'} VisualMode */

const definitions = {
  astro: {
    port: 4311,
    development: './node_modules/.bin/astro dev --host 127.0.0.1 --port 4311',
    production: './node_modules/.bin/astro build && ./node_modules/.bin/astro preview --host 127.0.0.1 --port 4311',
  },
  gatsby: {
    port: 4312,
    development: './node_modules/.bin/gatsby develop --host 127.0.0.1 --port 4312',
    production:
      './node_modules/.bin/gatsby clean && ./node_modules/.bin/gatsby build && ./node_modules/.bin/gatsby serve -H 127.0.0.1 -p 4312',
  },
  next: {
    port: 4313,
    development: './node_modules/.bin/next dev --webpack --hostname 127.0.0.1 --port 4313',
    production:
      './node_modules/.bin/next build --webpack && ./node_modules/.bin/next start --hostname 127.0.0.1 --port 4313',
  },
  react: {
    port: 4314,
    development: 'HOST=127.0.0.1 PORT=4314 ./node_modules/.bin/react-app-rewired start',
    production: './node_modules/.bin/react-app-rewired build && node ../../tests/scripts/static-server.mjs build 4314',
  },
  vite: {
    port: 4315,
    development: './node_modules/.bin/vite --host 127.0.0.1 --port 4315',
    production: './node_modules/.bin/vite build && ./node_modules/.bin/vite preview --host 127.0.0.1 --port 4315',
  },
  remix: {
    port: 4316,
    development: 'VITE_CJS_IGNORE_WARNING=true ./node_modules/.bin/remix vite:dev --host 127.0.0.1 --port 4316',
    production:
      'VITE_CJS_IGNORE_WARNING=true ./node_modules/.bin/remix vite:build && PORT=4316 ./node_modules/.bin/remix-serve ./build/server/index.js',
  },
  solid: {
    port: 4317,
    development: './node_modules/.bin/vite --host 127.0.0.1 --port 4317',
    production: './node_modules/.bin/vite build && ./node_modules/.bin/vite preview --host 127.0.0.1 --port 4317',
  },
};

export const frameworks = Object.freeze(Object.keys(definitions));

/** Returns the isolated web-server configuration for one fixture and mode. */
export function frameworkServer(framework, mode) {
  const definition = definitions[framework];
  if (!definition || (mode !== 'development' && mode !== 'production')) {
    throw new Error(`Unknown CSSX visual test target: ${framework}/${mode}`);
  }
  return {
    cwd: resolve(examples, framework),
    command: definition[mode],
    url: `http://127.0.0.1:${definition.port}`,
  };
}
