import { describe, expect, it } from 'vitest';

// @ts-expect-error The editor extension ships CommonJS without declaration files.
import { documentation, stripVariants } from '../src/catalog-documentation.js';

describe('catalog documentation', () => {
  it('documents exact utilities and value families after stripping variants and modifiers', () => {
    expect(documentation('hover:!flex')).toBe('**flex** — CSSX utility.');
    expect(documentation('md:animation-duration-300')).toBe(
      '**animation-duration-300** — Animation duration utility. Values are resolved during compilation.',
    );
    expect(documentation('bg-red-500')).toMatch(/^\*\*bg-red-500\*\* — bg color — #[\da-f]{6}\.$/i);
    expect(documentation('unknown')).toBeNull();
  });

  it('leaves arbitrary-value colons inside a candidate while stripping real variants', () => {
    expect(stripVariants('[&:hover]:text-[length:var(--font-size)]')).toBe('text-[length:var(--font-size)]');
    expect(stripVariants('hover:focus:flex')).toBe('flex');
    expect(stripVariants('text-]')).toBe('text-]');
  });
});
