import { splitCandidateList } from '@cssxio/compiler';
import { describe, expect, it } from 'vitest';

// @ts-expect-error The editor extension ships CommonJS without declaration files.
import { lastTopLevelSeparator, scanSeparators, splitCandidateRanges } from './candidate-syntax.js';

describe('CSSX candidate syntax scanner', () => {
  it('splits only at whitespace outside nested values and keeps unfinished candidates', () => {
    const completeList =
      'grid-cols-[13rem minmax(0,1fr)] bg-[linear-gradient(to right, red, blue)] shadow-[inset 0 0 0 1px #36c] animate-[fade 1s ease-in] [& h1]:text-lg [@media (width >= 40rem)]:text-lg animation-duration-(--duration, 1s) text-red-500';
    const scannedList = splitCandidateRanges(completeList).map(({ start, end }: { start: number; end: number }) =>
      completeList.slice(start, end),
    );
    expect(scannedList).toEqual([
      'grid-cols-[13rem minmax(0,1fr)]',
      'bg-[linear-gradient(to right, red, blue)]',
      'shadow-[inset 0 0 0 1px #36c]',
      'animate-[fade 1s ease-in]',
      '[& h1]:text-lg',
      '[@media (width >= 40rem)]:text-lg',
      'animation-duration-(--duration, 1s)',
      'text-red-500',
    ]);
    expect(scannedList).toEqual(splitCandidateList(completeList));
    expect(splitCandidateRanges('w-[calc(100vw - 2rem')).toEqual([{ start: 0, end: 20 }]);
    expect(splitCandidateRanges('content-["hello world')).toEqual([{ start: 0, end: 21 }]);
    expect(splitCandidateRanges('animation-duration-(--duration, 1s')).toEqual([{ start: 0, end: 34 }]);
    expect(splitCandidateRanges('text-sm  text-lg')).toEqual([
      { start: 0, end: 7 },
      { start: 9, end: 16 },
    ]);
    expect(splitCandidateRanges('text-sm ')).toEqual([{ start: 0, end: 7 }]);
    expect(splitCandidateRanges('')).toEqual([]);
  });

  it('protects escaped separators and advances over unicode code points', () => {
    expect(scanSeparators('before\\ after 😀 next', null)).toEqual([
      { index: 13, length: 1 },
      { index: 16, length: 1 },
    ]);
    expect(
      splitCandidateRanges('before\\ after 😀 next').map(({ start, end }: { start: number; end: number }) =>
        'before\\ after 😀 next'.slice(start, end),
      ),
    ).toEqual(['before\\ after', '😀', 'next']);
  });

  it('finds variant colons outside quoted selectors, parentheses, escapes, and brackets', () => {
    expect(lastTopLevelSeparator('[&[data-label="["] h1]:text-', ':')).toBe(22);
    expect(lastTopLevelSeparator('[&:hover]:text-[length:var(--font-size)]', ':')).toBe(9);
    expect(lastTopLevelSeparator('foo\\:bar:hover:flex', ':')).toBe(14);
    expect(lastTopLevelSeparator('animation-(--name, ease:in):text-', ':')).toBe(27);
    expect(lastTopLevelSeparator('text-[length:var(--font-size)]', ':')).toBe(-1);
    expect(lastTopLevelSeparator('plain', ':')).toBe(-1);
  });

  it('does not split on spaces, colons, or brackets inside either quote style', () => {
    expect(scanSeparators('content-["a [ b: c"] next', null)).toEqual([{ index: 20, length: 1 }]);
    expect(scanSeparators("content-['a [ b: c'] next", ':')).toEqual([]);
    expect(lastTopLevelSeparator('x-(a [ b:c]) : text-', ':')).toBe(13);
  });
});
