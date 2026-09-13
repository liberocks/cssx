import { runCommand } from './run-command';

/**
 * Runs a JavaScript file with the current Node.js executable.
 *
 * @param path JavaScript file to execute.
 * @returns Standard output and standard error.
 */
export async function runNode(path: string): Promise<{ readonly stdout: string; readonly stderr: string }> {
  return runCommand(process.execPath, [path]);
}
