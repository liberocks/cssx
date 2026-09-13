import { expect, it } from 'vitest';

import type { ParsedCandidate } from './candidate-types';
import { cssOrder } from './css-order';
import type { UtilityDeclaration } from './utility-types';

const candidate: ParsedCandidate = { raw: 'p-1', variants: [], utility: 'p-1', important: false, negative: false };

function order(
  variants: readonly string[] = [],
  group = 'p',
  declarations: readonly UtilityDeclaration[] = [{ property: 'color', value: 'red' }],
): string {
  return cssOrder({ ...candidate, variants }, group, declarations);
}

it('orders plain longhand utilities after shorthand and controller phases', () => {
  expect(order()).toBe('200\u0000\u0000100\u0000p');
});

it('applies known breakpoint and state variant weights', () => {
  expect(order(['sm'])).toContain('\u0000100:sm\u0000');
  expect(order(['md', 'lg'])).toContain('\u0000101:md:102:lg\u0000');
  expect(order(['2xl'])).toContain('\u0000104:2xl\u0000');
  expect(order(['dark'])).toContain('\u0000200:dark\u0000');
  expect(order(['print'])).toContain('\u0000300:print\u0000');
});

it('falls back to a low weight for unknown variants', () => {
  expect(order(['hover'])).toContain('\u0000010:hover\u0000');
});

it('uses the pinned cascade weight for known directional groups', () => {
  expect(order([], 'pt')).toContain('\u0000120\u0000pt');
  expect(order([], 'inset-x')).toContain('\u0000310\u0000inset-x');
});

it('falls back to a high weight for unknown groups', () => {
  expect(order([], 'color')).toContain('\u0000900\u0000color');
});

it('raises shorthand and multi-property transition controllers to the first phase', () => {
  expect(order([], 'p', [{ property: 'font', value: '1rem' }])).toContain('100\u0000');
  expect(order([], 'p', [{ property: 'transition-property', value: 'all' }, { property: 'color', value: 'red' }])).toContain('100\u0000');
  expect(order([], 'p', [{ property: 'transition-property', value: 'all' }])).toContain('100\u0000');
  expect(order([], 'p', [{ property: 'color', value: 'red' }, { property: 'opacity', value: '1' }])).toContain('200\u0000');
});

it('raises progressive-enhancement timelines above shorthands', () => {
  expect(order([], 'p', [{ property: 'animation-timeline', value: 'auto' }])).toContain('300\u0000');
  expect(order([], 'p', [{ property: 'animation-range-start', value: 'normal' }])).toContain('300\u0000');
  expect(order([], 'p', [{ property: 'scroll-timeline-name', value: 'none' }])).toContain('300\u0000');
  expect(order([], 'p', [{ property: 'view-timeline-axis', value: 'block' }])).toContain('300\u0000');
  expect(order([], 'p', [{ property: 'timeline-scope', value: 'none' }])).toContain('300\u0000');
});

it('raises starting-style and View Transition rules to the top phases', () => {
  expect(order(['starting'])).toContain('400\u0000');
  expect(order(['vt-old', 'starting'])).toContain('500\u0000');
  expect(order(['vt-new'])).toContain('500\u0000');
});