import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { cliInternals, launchCli, runCli } from '../../src/cli';

let directory = '';

afterEach(async () => {
  if (directory) {
    await rm(directory, { recursive: true, force: true });
  }
  directory = '';
});

async function makeProject(): Promise<string> {
  directory = await mkdtemp(join(tmpdir(), 'cssx-format-e2e-'));
  await writeFile(join(directory, 'page.tsx'), `import { sx } from '@cssxio/cssx'; sx("bg-white   p-4");`);
  return directory;
}

describe('cssx-format CLI', () => {
  it('prints help and validates flags', async () => {
    const messages: string[] = [];
    expect(await runCli(['--help'], { log: (message) => messages.push(message) })).toBe(0);
    expect(messages[0]).toContain('Usage: cssx-format');
    expect(await runCli(['-h'], { log: (message) => messages.push(message) })).toBe(0);
    expect(await runCli(['--unknown'], { log: (message) => messages.push(message) })).toBe(2);
    expect(await runCli(['--ignore-path'], { log: (message) => messages.push(message) })).toBe(2);
    expect(await runCli(['--ignore-path='], { log: (message) => messages.push(message) })).toBe(2);
    expect(await runCli(['--ignore-path=valid.ignore', '--help'], { log: (message) => messages.push(message) })).toBe(
      0,
    );
    expect(await runCli(['--help'])).toBe(0);
    const invalidArgument = new Proxy(
      {},
      {
        get: (_target, key) =>
          key === 'startsWith'
            ? () => {
                throw 'raw parse error';
              }
            : undefined,
      },
    );
    expect(await runCli([invalidArgument] as never, { log: (message) => messages.push(message) })).toBe(2);
    expect(messages).toContain('raw parse error');
  });

  it('checks a directory, respects ignore patterns, and reports pending files', async () => {
    const cwd = await makeProject();
    await mkdir(join(cwd, 'generated', 'nested'), { recursive: true });
    await mkdir(join(cwd, '.open-next', 'server'), { recursive: true });
    await mkdir(join(cwd, 'node_modules', 'generated'), { recursive: true });
    await writeFile(
      join(cwd, '.cssxformatignore'),
      '# generated output\ngenerated/**/*.tsx\nignored.tsx\ndraft?.tsx\n**cache.tsx\n',
    );
    await writeFile(
      join(cwd, 'generated', 'nested', 'output.tsx'),
      `import { sx } from '@cssxio/cssx'; sx("bg-white   p-4");`,
    );
    await writeFile(join(cwd, 'ignored.tsx'), `import { sx } from '@cssxio/cssx'; sx("bg-white   p-4");`);
    await writeFile(join(cwd, 'draft1.tsx'), `import { sx } from '@cssxio/cssx'; sx("bg-white   p-4");`);
    await writeFile(join(cwd, 'supercache.tsx'), `import { sx } from '@cssxio/cssx'; sx("bg-white   p-4");`);
    await writeFile(
      join(cwd, '.open-next', 'server', 'output.tsx'),
      `import { sx } from '@cssxio/cssx'; sx("bg-white   p-4");`,
    );
    await writeFile(
      join(cwd, 'node_modules', 'generated', 'output.tsx'),
      `import { sx } from '@cssxio/cssx'; sx("bg-white   p-4");`,
    );
    const messages: string[] = [];
    expect(await runCli(['--check', '.'], { cwd, log: (message) => messages.push(message) })).toBe(1);
    expect(messages).toEqual(['would format page.tsx']);
  });

  it('writes a file and checks glob inputs', async () => {
    const cwd = await makeProject();
    const messages: string[] = [];
    expect(await runCli(['--write', 'page.tsx'], { cwd, log: (message) => messages.push(message) })).toBe(0);
    expect(messages).toEqual(['formatted page.tsx']);
    expect(await readFile(join(cwd, 'page.tsx'), 'utf8')).toContain('sx("p-4 bg-white")');
    await mkdir(join(cwd, 'src'), { recursive: true });
    await writeFile(join(cwd, 'src', 'route.tsx'), `import { sx } from '@cssxio/cssx'; sx("bg-white   p-4");`);
    expect(await runCli(['--check', 'src/*.tsx'], { cwd, log: () => undefined })).toBe(1);
    expect(await runCli(['--check', 'page.tsx'], { cwd, log: () => undefined })).toBe(0);
    expect(await runCli(['--check', join(cwd, 'page.tsx')], { cwd, log: () => undefined })).toBe(0);
  });

  it('accepts a custom ignore file and leaves parser errors unchanged', async () => {
    const cwd = await makeProject();
    await writeFile(join(cwd, 'custom.ignore'), 'page.tsx\ngenerated\n');
    expect(await runCli(['--check', '--ignore-path', 'custom.ignore', '.'], { cwd, log: () => undefined })).toBe(0);
    await mkdir(join(cwd, 'generated', 'nested'), { recursive: true });
    await writeFile(
      join(cwd, 'generated', 'nested', 'ignored.tsx'),
      `import { sx } from '@cssxio/cssx'; sx("bg-white   p-4");`,
    );
    expect(
      await runCli(['--check', '--ignore-path', 'custom.ignore', 'generated/nested/ignored.tsx'], {
        cwd,
        log: () => undefined,
      }),
    ).toBe(0);
    await writeFile(join(cwd, 'broken.tsx'), `import { sx } from '@cssxio/cssx'; sx("bg-white   p-4";`);
    expect(await runCli(['--write', 'broken.tsx'], { cwd, log: () => undefined })).toBe(2);
    expect(await readFile(join(cwd, 'broken.tsx'), 'utf8')).toContain('bg-white   p-4');
  });

  it('reports filesystem errors other than a missing ignore file', async () => {
    const cwd = await makeProject();
    await mkdir(join(cwd, 'ignore-directory'));
    await expect(runCli(['--ignore-path', 'ignore-directory'], { cwd, log: () => undefined })).rejects.toThrow();
  });

  it('rethrows non-missing stat errors and treats existing non-files as inputs with no matches', async () => {
    const cwd = await makeProject();
    const permissionError = Object.assign(new Error('denied'), { code: 'EACCES' });
    await expect(
      runCli(['locked.tsx'], {
        cwd,
        log: () => undefined,
        stat: async () => {
          throw permissionError;
        },
      }),
    ).rejects.toBe(permissionError);

    const stat = async () => ({ isDirectory: () => false, isFile: () => false }) as never;
    expect(await runCli(['special'], { cwd, log: () => undefined, stat })).toBe(0);
  });

  it('starts only when the formatter module is the process entry point', async () => {
    const project = directory || (await makeProject());
    const scriptPath = join(project, 'cli.js');
    await writeFile(scriptPath, '');
    const moduleUrl = pathToFileURL(scriptPath).href;
    let exitCode = -1;
    expect(
      launchCli(moduleUrl, undefined, ['--help'], (code) => {
        exitCode = code;
      }),
    ).toBeUndefined();
    expect(launchCli(moduleUrl, join(project, 'missing.js'), ['--help'], () => undefined)).toBeUndefined();
    const otherScript = join(project, 'other.js');
    await writeFile(otherScript, '');
    expect(launchCli(moduleUrl, otherScript, ['--help'], () => undefined)).toBeUndefined();
    await launchCli(moduleUrl, scriptPath, ['--help'], (code) => {
      exitCode = code;
    });
    expect(exitCode).toBe(0);
    const ignoreDirectory = join(project, 'ignore-directory');
    await mkdir(ignoreDirectory, { recursive: true });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    exitCode = -1;
    await launchCli(moduleUrl, scriptPath, ['--ignore-path', ignoreDirectory], (code) => {
      exitCode = code;
    });
    expect(exitCode).toBe(2);
    expect(consoleError).toHaveBeenCalledOnce();
    consoleError.mockRestore();
    if (process.platform !== 'win32') {
      const linkedPath = join(project, 'cli-link.js');
      await symlink(scriptPath, linkedPath);
      exitCode = -1;
      await launchCli(moduleUrl, linkedPath, ['--help'], (code) => {
        exitCode = code;
      });
      expect(exitCode).toBe(0);
    }
    const previousExitCode = process.exitCode;
    cliInternals.setProcessExitCode(12);
    expect(process.exitCode).toBe(12);
    process.exitCode = previousExitCode;
  });

  it('defaults to the current directory and handles an unmatched glob', async () => {
    const cwd = await makeProject();
    expect(await runCli([], { cwd, log: () => undefined })).toBe(0);
    expect(await readFile(join(cwd, 'page.tsx'), 'utf8')).toContain('sx("p-4 bg-white")');
    expect(await runCli(['--check', 'missing/**/*.tsx'], { cwd, log: () => undefined })).toBe(0);
  });
});
