import { describe, expect, it } from 'vitest';

import { classifyUtilityGroup } from './classify-utility-group';

describe('classifyUtilityGroup', () => {
  it('checks arbitrary properties and exact declarations before prefix groups', () => {
    expect(classifyUtilityGroup('[paint-order:markers]')).toBe('arbitrary..paint-order');
    expect(classifyUtilityGroup('block')).toBe('display');
    expect(classifyUtilityGroup('p-4')).toBe('p');
  });

  it('returns null for invalid arbitrary properties and unknown utilities', () => {
    expect(classifyUtilityGroup('[123:value]')).toBeNull();
    expect(classifyUtilityGroup('not-a-utility')).toBeNull();
  });
});
