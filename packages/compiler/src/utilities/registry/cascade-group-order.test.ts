import { describe, expect, it } from 'vitest';

import { CASCADE_GROUP_ORDER } from './cascade-group-order';

describe('CASCADE_GROUP_ORDER', () => {
  it('orders broad spacing groups before their narrower directional groups', () => {
    expect(CASCADE_GROUP_ORDER.p).toBeLessThan(CASCADE_GROUP_ORDER.px!);
    expect(CASCADE_GROUP_ORDER.px).toBeLessThan(CASCADE_GROUP_ORDER.pt!);
    expect(CASCADE_GROUP_ORDER.m).toBeLessThan(CASCADE_GROUP_ORDER.mx!);
    expect(CASCADE_GROUP_ORDER.mx).toBeLessThan(CASCADE_GROUP_ORDER.mt!);
  });

  it('orders broad layout, gap, and border groups before narrow groups', () => {
    expect(CASCADE_GROUP_ORDER.inset).toBeLessThan(CASCADE_GROUP_ORDER['inset-x']!);
    expect(CASCADE_GROUP_ORDER['inset-x']).toBeLessThan(CASCADE_GROUP_ORDER.top!);
    expect(CASCADE_GROUP_ORDER.size).toBeLessThan(CASCADE_GROUP_ORDER.width!);
    expect(CASCADE_GROUP_ORDER.gap).toBeLessThan(CASCADE_GROUP_ORDER['row-gap']!);
    expect(CASCADE_GROUP_ORDER.border).toBeLessThan(CASCADE_GROUP_ORDER['border-x']!);
    expect(CASCADE_GROUP_ORDER['border-x']).toBeLessThan(CASCADE_GROUP_ORDER['border-top']!);
  });

  it('assigns a finite priority to every registered group', () => {
    expect(Object.keys(CASCADE_GROUP_ORDER).length).toBeGreaterThan(40);
    for (const [group, priority] of Object.entries(CASCADE_GROUP_ORDER)) {
      expect(Number.isFinite(priority), group).toBe(true);
    }
  });
});
