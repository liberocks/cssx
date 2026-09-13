import { describe, expect, it } from 'vitest';

// @ts-expect-error The editor extension ships CommonJS without declaration files.
import { documentation } from '../src/catalog-documentation.js';

describe('catalog documentation', () => {
  it('documents exact utilities and value families after stripping variants and modifiers', () => {
    expect(documentation('hover:!flex')).toBe('**flex** — CSSX utility.');
    expect(documentation('md:animation-duration-300')).toBe(
      '**animation-duration-300** — Animation duration utility. Values are resolved during compilation.',
    );
    expect(documentation('unknown')).toBeNull();
  });
});
