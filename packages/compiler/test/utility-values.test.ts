import { describe, expect, it } from 'vitest';

import type { UtilityDeclaration } from '../src/utility-types';
import {
  atomizeDeclarations,
  cloneDeclarations,
  leadingValue,
  millisecondsValue,
  resolveAngleValue,
  resolveScaleValue,
  trackingValue,
} from '../src/utility-values';

describe('utility value helpers', () => {
  it('clones declarations and preserves atomic semantic groups', () => {
    const declarations: UtilityDeclaration[] = [
      { property: 'color', value: 'red', semanticGroup: 'color' },
      { property: 'background-color', value: 'blue', semanticGroup: 'color' },
      { property: 'display', value: 'block' },
    ];
    const cloned = cloneDeclarations(declarations);

    cloned[0]!.value = 'green';
    expect(declarations[0]?.value).toBe('red');
    expect(atomizeDeclarations(declarations)).toEqual([[declarations[0], declarations[1]], [declarations[2]]]);
  });

  it('splits composable transform channels while keeping their sinks', () => {
    const declarations: UtilityDeclaration[] = [
      { property: '--cssx-scale-x', value: '.9' },
      { property: '--cssx-scale-y', value: '.9' },
      { property: 'scale', value: 'var(--cssx-scale-x) var(--cssx-scale-y)' },
      { property: '--cssx-translate-x', value: '1rem' },
      { property: 'translate', value: 'var(--cssx-translate-x) 0' },
      { property: '--cssx-skew-y', value: '2deg' },
      { property: 'transform', value: 'skewY(var(--cssx-skew-y))' },
    ];
