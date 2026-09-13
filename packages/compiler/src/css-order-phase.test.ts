import { expect, it } from 'vitest';

import type { ParsedCandidate } from './candidate-types';
import { cssOrderPhase } from './css-order-phase';
import type { UtilityDeclaration } from './utility-types';

const candidate: ParsedCandidate = { raw: 'p-1', variants: [], utility: 'p-1', important: false, negative: false };

function phase(variants: readonly string[] = [], declarations: readonly UtilityDeclaration[] = []): number {
  return cssOrderPhase({ ...candidate, variants }, declarations);
}

it('places ordinary declarations after shorthands and transition controllers', () => {
  expect(phase()).toBe(200);
  expect(phase([], [{ property: 'font', value: '1rem' }])).toBe(100);
  expect(
    phase(
      [],
      [
        { property: 'transition-property', value: 'all' },
        { property: 'color', value: 'red' },
      ],
    ),
  ).toBe(100);
});

it('places progressive-enhancement timeline declarations after ordinary rules', () => {
  for (const property of [
    'animation-timeline',
    'animation-range-start',
    'scroll-timeline-name',
    'view-timeline-axis',
    'timeline-scope',
  ]) {
    expect(phase([], [{ property, value: 'auto' }])).toBe(300);
  }
});

it('places starting-style and View Transition rules in their designated phases', () => {
  expect(phase(['starting'])).toBe(400);
  expect(phase(['vt-old'])).toBe(500);
  expect(phase(['vt-old', 'starting'])).toBe(500);
});
