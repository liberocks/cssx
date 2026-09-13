import { describe, expect, it } from 'vitest';

import { compileAnimationTimeline } from './compile-animation-timeline';

describe('compileAnimationTimeline', () => {
  it('compiles fixed, scroll, view, and named timeline consumers', () => {
    expect(compileAnimationTimeline('animation-timeline-auto')).toMatchObject({
      property: 'animation-timeline',
      value: 'auto',
    });
    expect(compileAnimationTimeline('animation-timeline-none')).toMatchObject({ value: 'none' });
    expect(compileAnimationTimeline('animation-timeline-scroll-root-block')?.value).toBe('scroll(root block)');
    expect(compileAnimationTimeline('animation-timeline-scroll-inline')?.value).toBe('scroll(inline)');
    expect(compileAnimationTimeline('animation-timeline-view-x')?.value).toBe('view(x)');
    expect(compileAnimationTimeline('animation-timeline-[--hero]')?.value).toBe('--hero');
  });

  it('rejects unsupported timeline consumers', () => {
    expect(compileAnimationTimeline('animation-timeline-scroll-z')).toBeNull();
    expect(compileAnimationTimeline('animation-timeline-[bad-name]')).toBeNull();
    expect(compileAnimationTimeline('other-timeline')).toBeNull();
  });
});
