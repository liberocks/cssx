import { expect, it } from 'vitest';

import { inspectCalls } from './ast-test-paths';
import { diagnosticError } from './diagnostic-error';

it('returns code-frame errors in development and plain errors in production', () => {
  const path = inspectCalls('target();', (callPath) => callPath)[0]!;
  const originalEnvironment = process.env.NODE_ENV;

  try {
    process.env.NODE_ENV = 'development';
    expect(diagnosticError(path, 'problem').message).toContain('problem');
    process.env.NODE_ENV = 'production';
    const error = diagnosticError(path, 'problem');
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('problem');
    expect(error.message).not.toContain('> 1 |');
  } finally {
    process.env.NODE_ENV = originalEnvironment;
  }
});
