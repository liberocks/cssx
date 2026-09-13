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

    expect(atomizeDeclarations(declarations)).toEqual([
      [declarations[0], declarations[2]],
      [declarations[1], declarations[2]],
      [declarations[3], declarations[4]],
      [declarations[5], declarations[6]],
    ]);
  });

  it('resolves named and arbitrary text, transition, angle, and scale values', () => {
    expect(leadingValue('tight')).toBe('1.25');
    expect(leadingValue('[1.1]')).toBe('1.1');
    expect(leadingValue('3')).toBe('3');
    expect(trackingValue('wide')).toBe('0.025em');
    expect(trackingValue('custom')).toBe('custom');
    expect(millisecondsValue('150')).toBe('150ms');
    expect(millisecondsValue('[.2s]')).toBe('.2s');
    expect(resolveAngleValue('45', false)).toBe('45deg');
    expect(resolveAngleValue('[.25turn]', true)).toBe('-.25turn');
    expect(resolveAngleValue('bad', false)).toBeNull();
    expect(resolveScaleValue('125', false)).toBe('1.25');
    expect(resolveScaleValue('[.8]', true)).toBe('-.8');
    expect(resolveScaleValue('bad', false)).toBeNull();
    expect(resolveAngleValue('[.25turn]', false)).toBe('.25turn');
    expect(resolveScaleValue('[.8]', false)).toBe('.8');
    expect(resolveScaleValue('50', true)).toBe('-0.5');
  });

  it('keeps non-composable declaration sequences independent', () => {
    const declarations: UtilityDeclaration[] = [
      { property: 'color', value: 'red', semanticGroup: 'color' },
      { property: 'background-color', value: 'blue', semanticGroup: 'background' },
      { property: '--cssx-translate-x', value: '1rem' },
      { property: 'color', value: 'green' },
    ];

    expect(atomizeDeclarations(declarations)).toEqual([
      [declarations[0]],
      [declarations[1]],
      [declarations[2]],
      [declarations[3]],
    ]);
  });
});
