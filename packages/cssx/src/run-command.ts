/**
 * Runs a child process and captures its UTF-8 output.
 *
 * @param command Executable path or command name.
 * @param args Arguments passed to the child process.
 * @param cwd Optional working directory.
 * @returns Standard output and standard error.
 */
export async function runCommand(
  command: string,
  args: readonly string[],
  cwd?: string,
): Promise<{ readonly stdout: string; readonly stderr: string }> {
  const childProcess = await import('node:child_process');
  return new Promise((resolvePromise, reject) => {
    childProcess.execFile(command, args, { cwd, encoding: 'utf8' }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`Package contract runner failed: ${stderr || error.message}`));
      } else {
        resolvePromise({ stdout, stderr });
      }
    });
  });
}
