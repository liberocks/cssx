import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

import { frameworkDefinition } from '../shared/frameworks.js';

const [framework, mode] = process.argv.slice(2);
const definition = frameworkDefinition(framework, mode);
const root = resolve(import.meta.dirname, '../..');
const command = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

/** Runs one process and resolves when it exits successfully. */
function run(args, cwd, env = {}) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, ...env },
      stdio: 'inherit',
    });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) {
        resolveRun();
        return;
      }
      reject(new Error(`${framework} ${mode} exited with ${signal ?? `code ${code ?? 'unknown'}`}.`));
    });
  });
}

/** Starts the persistent framework server and forwards lifecycle signals. */
function serve(args, cwd, env = {}) {
  const child = spawn(command, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: 'inherit',
  });
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => child.kill(signal));
  }
  child.once('error', (error) => {
    throw error;
  });
  child.once('exit', (code) => process.exit(code ?? 1));
}

const example = resolve(root, 'examples', framework);
const local = (binary, ...args) => ['exec', binary, ...args];
const host = ['--host', '127.0.0.1', '--port', String(definition.port)];

if (mode === 'development') {
  switch (framework) {
    case 'astro':
      serve(local('astro', 'dev', ...host), example);
      break;
    case 'gatsby':
      serve(local('gatsby', 'develop', '--host', '127.0.0.1', '--port', String(definition.port)), example);
      break;
    case 'next':
      serve(local('next', 'dev', '--webpack', '--hostname', '127.0.0.1', '--port', String(definition.port)), example);
      break;
    case 'react':
      serve(local('react-app-rewired', 'start'), example, {
        BROWSER: 'none',
        HOST: '127.0.0.1',
        PORT: String(definition.port),
      });
      break;
    case 'vite':
    case 'solid':
      serve(local('vite', ...host), example);
      break;
    case 'remix':
      serve(local('remix', 'vite:dev', '--host', '127.0.0.1', '--port', String(definition.port)), example, {
        VITE_CJS_IGNORE_WARNING: 'true',
      });
      break;
    default:
      throw new Error(`Unsupported development framework: ${framework}`);
  }
} else {
  const build = async () => {
    switch (framework) {
      case 'astro':
        await run(local('astro', 'build'), example);
        serve(local('astro', 'preview', ...host), example);
        break;
      case 'gatsby':
        await run(local('gatsby', 'clean'), example);
        await run(local('gatsby', 'build'), example);
        serve(local('gatsby', 'serve', '-H', '127.0.0.1', '-p', String(definition.port)), example);
        break;
      case 'next':
        await run(local('next', 'build', '--webpack'), example);
        serve(local('next', 'start', '--hostname', '127.0.0.1', '--port', String(definition.port)), example);
        break;
      case 'react':
        await run(local('react-app-rewired', 'build'), example);
        serve(
          ['exec', 'node', resolve(root, 'tests/scripts/static-server.mjs'), 'build', String(definition.port)],
          example,
        );
        break;
      case 'vite':
      case 'solid':
        await run(local('vite', 'build'), example);
        serve(local('vite', 'preview', ...host), example);
        break;
      case 'remix':
        await run(local('remix', 'vite:build'), example, { VITE_CJS_IGNORE_WARNING: 'true' });
        serve(local('remix-serve', './build/server/index.js'), example, { PORT: String(definition.port) });
        break;
      default:
        throw new Error(`Unsupported production framework: ${framework}`);
    }
  };
  void build().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
