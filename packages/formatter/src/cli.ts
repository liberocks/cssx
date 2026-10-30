#!/usr/bin/env node
import { realpathSync } from 'node:fs';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { glob } from 'tinyglobby';

import { formatSource } from './format-source';

const sourcePatterns = '**/*.{js,jsx,ts,tsx,mjs,mjsx,mts,mtsx,cjs,cjsx,cts,ctsx}';
const defaultIgnored = [
  '**/.git/**',
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/coverage/**',
  '**/.next/**',
  '**/.open-next/**',
  '**/.nuxt/**',
  '**/.svelte-kit/**',
  '**/.astro/**',
  '**/.vite/**',
  '**/.turbo/**',
  '**/.vercel/**',
  '**/.cache/**',
  '**/.output/**',
  '**/out/**',
  '**/target/**',
  '**/storybook-static/**',
];

interface CliOptions {
  readonly paths: string[];
  readonly mode: 'write' | 'check';
  readonly ignorePath: string;
  readonly help: boolean;
}

export interface CliIo {
  readonly cwd?: string;
  readonly log?: (message: string) => void;
  readonly stat?: (path: string) => Promise<Awaited<ReturnType<typeof stat>>>;
}

/** Starts the CLI only when this module is the process entry point. */
export function launchCli(
  moduleUrl: string,
  scriptPath: string | undefined,
  arguments_: readonly string[],
  setExitCode: (code: number) => void,
): Promise<void> | undefined {
  if (!scriptPath) {
    return undefined;
  }
  try {
    if (realpathSync(fileURLToPath(moduleUrl)) !== realpathSync(scriptPath)) {
      return undefined;
    }
  } catch {
    return undefined;
  }
  return runCli(arguments_)
    .then(setExitCode)
    .catch((error: unknown) => {
      console.error(error);
      setExitCode(2);
    });
}

/** Runs the CSSX formatter CLI and returns its process exit code. */
export async function runCli(arguments_: readonly string[], io: CliIo = {}): Promise<number> {
  const cwd = resolve(io.cwd ?? process.cwd());
  const log = io.log ?? console.log;
  let options: CliOptions;
  try {
    options = parseArguments(arguments_);
  } catch (error) {
    log(error instanceof Error ? error.message : String(error));
    return 2;
  }
  if (options.help) {
    log('Usage: cssx-format [--write | --check] [--ignore-path <file>] [file | directory | glob ...]');
    return 0;
  }

  const ignoreFile = resolve(cwd, options.ignorePath);
  const ignored = [...defaultIgnored, ...(await readIgnorePatterns(ignoreFile))];
  const paths = await resolveFiles(options.paths.length > 0 ? options.paths : ['.'], cwd, ignored, io.stat ?? stat);
  let changed = 0;
  let errors = 0;
  for (const filename of paths) {
    const source = await readFile(filename, 'utf8');
    const result = formatSource(source, { filename });
    if (result.diagnostics.length > 0) {
      errors += result.diagnostics.length;
      for (const diagnostic of result.diagnostics) {
        log(`${relative(cwd, filename)}: ${diagnostic.message}`);
      }
      continue;
    }
    if (!result.changed) {
      continue;
    }
    changed += 1;
    if (options.mode === 'write') {
      await writeFile(filename, result.code);
      log(`formatted ${relative(cwd, filename)}`);
    } else {
      log(`would format ${relative(cwd, filename)}`);
    }
  }
  if (errors > 0) {
    return 2;
  }
  if (options.mode === 'check' && changed > 0) {
    return 1;
  }
  return 0;
}

function parseArguments(arguments_: readonly string[]): CliOptions {
  const paths: string[] = [];
  let mode: 'write' | 'check' = 'write';
  let ignorePath = '.cssxformatignore';
  let help = false;
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index]!;
    if (argument === '--write') {
      mode = 'write';
    } else if (argument === '--check') {
      mode = 'check';
    } else if (argument === '--help' || argument === '-h') {
      help = true;
    } else if (argument === '--ignore-path') {
      const path = arguments_[index + 1];
      if (!path) {
        throw new Error('--ignore-path requires a file path.');
      }
      ignorePath = path;
      index += 1;
    } else if (argument.startsWith('--ignore-path=')) {
      ignorePath = argument.slice('--ignore-path='.length);
      if (!ignorePath) {
        throw new Error('--ignore-path requires a file path.');
      }
    } else if (argument.startsWith('-')) {
      throw new Error(`Unknown option: ${argument}`);
    } else {
      paths.push(argument);
    }
  }
  return { paths, mode, ignorePath, help };
}

async function readIgnorePatterns(filename: string): Promise<string[]> {
  try {
    return (await readFile(filename, 'utf8'))
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('#'));
  } catch (error) {
    if (isMissing(error)) {
      return [];
    }
    throw error;
  }
}

async function resolveFiles(
  inputs: readonly string[],
  cwd: string,
  ignored: readonly string[],
  statFile: (path: string) => Promise<Awaited<ReturnType<typeof stat>>>,
): Promise<string[]> {
  const patterns: string[] = [];
  const directFiles: string[] = [];
  for (const input of inputs) {
    const path = isAbsolute(input) ? input : resolve(cwd, input);
    try {
      const info = await statFile(path);
      if (info.isDirectory()) {
        patterns.push(`${relative(cwd, path) || '.'}/${sourcePatterns}`);
      } else if (info.isFile()) {
        directFiles.push(path);
      }
    } catch (error) {
      if (isMissing(error)) {
        patterns.push(input);
      } else {
        throw error;
      }
    }
  }
  const matches = await glob(patterns, { cwd, absolute: true, onlyFiles: true, dot: true, ignore: [...ignored] });
  const files = new Set([...directFiles, ...matches.map((path) => resolve(path))]);
  const ignorePatterns = ignored.map(globPattern);
  return [...files].filter((path) => !isIgnored(path, cwd, ignorePatterns)).sort();
}

function isIgnored(filename: string, cwd: string, patterns: readonly RegExp[]): boolean {
  const relativePath = relative(cwd, filename).split('\\').join('/');
  let ancestor = '';
  for (const segment of relativePath.split('/')) {
    ancestor = ancestor ? `${ancestor}/${segment}` : segment;
    if (patterns.some((pattern) => pattern.test(ancestor))) {
      return true;
    }
  }
  return false;
}

function globPattern(pattern: string): RegExp {
  const normalized = pattern.replace(/^\//, '').replace(/\/$/, '').split('\\').join('/');
  let expression = '^';
  for (let index = 0; index < normalized.length; index += 1) {
    const character = normalized[index]!;
    if (character === '*' && normalized[index + 1] === '*') {
      index += 1;
      if (normalized[index + 1] === '/') {
        index += 1;
        expression += '(?:.*/)?';
      } else {
        expression += '.*';
      }
    } else if (character === '*') {
      expression += '[^/]*';
    } else if (character === '?') {
      expression += '[^/]';
    } else {
      expression += character.replace(/[|\\{}()[\]^$+?.]/g, '\\$&');
    }
  }
  return new RegExp(`${expression}$`);
}

function isMissing(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';
}

function setProcessExitCode(exitCode: number): void {
  process.exitCode = exitCode;
}

launchCli(import.meta.url, process.argv[1], process.argv.slice(2), setProcessExitCode);

export const cliInternals = { setProcessExitCode };
