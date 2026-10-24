import { describe, expect, it } from 'vitest';

import { compileTimelineProducer } from './compile-timeline-producer';

describe('compileTimelineProducer', () => {
  it('compiles named scroll/view producers, axes, and arbitrary insets', () => {
    expect(compileTimelineProducer('scroll-timeline-name-[--progress]')).toMatchObject({
      property: 'scroll-timeline-name',
      value: '--progress',
    });
    expect(compileTimelineProducer('view-timeline-name-[--hero]')?.property).toBe('view-timeline-name');
    expect(compileTimelineProducer('scroll-timeline-axis-y')?.value).toBe('y');
    expect(compileTimelineProducer('view-timeline-axis-inline')?.value).toBe('inline');
    expect(compileTimelineProducer('view-timeline-inset-[10%_20%]')?.value).toBe('10% 20%');
  });

  it('compiles timeline scopes and rejects invalid declarations', () => {
    expect(compileTimelineProducer('timeline-scope-all')?.value).toBe('all');
    expect(compileTimelineProducer('timeline-scope-[--hero]')?.value).toBe('--hero');
    expect(compileTimelineProducer('scroll-timeline-name-[invalid]')).toBeNull();
    expect(compileTimelineProducer('scroll-timeline-axis-z')).toBeNull();
    expect(compileTimelineProducer('view-timeline-inset-[10px]')).toMatchObject({ value: '10px' });
    expect(compileTimelineProducer('not-a-timeline')).toBeNull();
  });
});
