import { describe, expect, it } from 'vitest';

import { compileViewTransitionUtility } from './compile-view-transition-utility';

describe('compileViewTransitionUtility', () => {
  it('compiles reserved values, valid custom names, and multiple classes', () => {
    expect(compileViewTransitionUtility('view-transition-name-none')?.value).toBe('none');
    expect(compileViewTransitionUtility('view-transition-name-match')?.value).toBe('match-element');
    expect(compileViewTransitionUtility('view-transition-name-[hero]')?.value).toBe('hero');
    expect(compileViewTransitionUtility('view-transition-class-none')?.value).toBe('none');
    expect(compileViewTransitionUtility('view-transition-class-[hero_card]')?.value).toBe('hero card');
  });

  it('rejects reserved, unsafe, and unknown names', () => {
    expect(compileViewTransitionUtility('view-transition-name-[inherit]')).toBeNull();
    expect(compileViewTransitionUtility('view-transition-name-[match-element]')).toBeNull();
    expect(compileViewTransitionUtility('view-transition-class-[none]')).toBeNull();
    expect(compileViewTransitionUtility('view-transition-name-[hero card]')).toBeNull();
    expect(compileViewTransitionUtility('not-view-transition')).toBeNull();
  });
});
