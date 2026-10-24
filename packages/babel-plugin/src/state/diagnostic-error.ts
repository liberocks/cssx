import type { NodePath } from '@babel/core';

/**
 * Creates a diagnostic error for a source path.
 *
 * @param path Source path where the diagnostic belongs.
 * @param message Error message to show.
 * @returns A plain error in production, or a code-frame error in other environments.
 */
export function diagnosticError(path: NodePath, message: string): Error {
  return process.env.NODE_ENV === 'production' ? new Error(message) : path.buildCodeFrameError(message);
}
