import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { compileStyleRecords } from '../src/index';

const CSSX_ONLY_CANDIDATES = [
  'transition-transform-opacity',
  'duration-normal',
  '-delay-75',
  'ease-spring-snappy',
  'animate-fade-in',
  'animation-name-shimmer',
  'animation-duration-500',
  'animation-composition-add',
  'stagger-normal',
  'stagger-index-2',
  'stagger-count-3',
  'stagger-reverse',
  'delay-stagger',
  'animation-delay-stagger',
  'animation-timeline-view-block',
  'scroll-timeline-name-[--reading]',
  'view-timeline-axis-inline',
  'timeline-scope-[--reading]',
  'animation-range-entry',
  'view-transition-name-[coverage-card]',
  'view-transition-class-[shared]',
  'content-visibility-auto',
  'contain-intrinsic-size-[auto_800px]',
  'scrollbar-thumb-red-500',
] as const;

const tailwind = JSON.parse(
  readFileSync(fileURLToPath(new URL('./fixtures/tailwind-4.3.3.json', import.meta.url)), 'utf8'),
) as { readonly supported: readonly string[]; readonly unsupported: readonly string[] };

describe('CSSX-only complete utility-family corpus', () => {
  it('stays distinct from the pinned Tailwind corpus and compiles every family', () => {
    const tailwindCandidates = new Set([...tailwind.supported, ...tailwind.unsupported]);

    for (const candidate of CSSX_ONLY_CANDIDATES) {
      expect(tailwindCandidates.has(candidate), candidate).toBe(false);
      expect(() => compileStyleRecords({ candidate }), candidate).not.toThrow();
    }
  });
});
