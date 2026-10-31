import { describe, expect, it } from 'vitest';

import { classifyUtilityGroup } from './classify-utility-group';

describe('classifyUtilityGroup', () => {
  it('checks arbitrary properties and exact declarations before prefix groups', () => {
    expect(classifyUtilityGroup('[paint-order:markers]')).toBe('arbitrary..paint-order');
    expect(classifyUtilityGroup('block')).toBe('display');
    expect(classifyUtilityGroup('p-4')).toBe('p');
  });

  it('classifies group and peer as structural markers', () => {
    expect(classifyUtilityGroup('group')).toBe('structural-group');
    expect(classifyUtilityGroup('peer')).toBe('structural-peer');
    expect(classifyUtilityGroup('group-field-group')).toBe('structural-group:group-field-group');
    expect(classifyUtilityGroup('peer-field-label')).toBe('structural-peer:peer-field-label');
  });

  it('classifies fluid font-size pairs as font-size utilities', () => {
    expect(classifyUtilityGroup('~text-3xl/4xl')).toBe('font-size');
  });

  it('returns null for invalid arbitrary properties and unknown utilities', () => {
    expect(classifyUtilityGroup('[123:value]')).toBeNull();
    expect(classifyUtilityGroup('not-a-utility')).toBeNull();
  });
});
