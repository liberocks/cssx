import { describe, expect, it } from 'vitest';

import { formatUtilityList } from '../../src/format-utility-list';

describe('formatUtilityList', () => {
  it('sorts utilities into semantic groups and collapses separators', () => {
    expect(formatUtilityList('w-full max-w-sm rounded-xl   bg-white p-7')).toBe(
      'w-full max-w-sm p-7 rounded-xl bg-white',
    );
  });

  it('preserves relative order for conflicting utilities and duplicates', () => {
    expect(formatUtilityList('p-4   p-2 p-4')).toBe('p-4 p-2 p-4');
    expect(formatUtilityList('px-2 p-4')).toBe('px-2 p-4');
    expect(formatUtilityList('p-4 px-2')).toBe('p-4 px-2');
  });

  it('keeps unknown and ambiguous candidates as sorting boundaries', () => {
    expect(formatUtilityList('bg-white   custom-token p-4 rounded-xl')).toBe('bg-white custom-token p-4 rounded-xl');
  });

  it('orders base utilities before variants using CSSX variant ordering', () => {
    expect(formatUtilityList('xl:bg-white hover:p-4 sm:rounded-md p-4')).toBe(
      'p-4 sm:rounded-md xl:bg-white hover:p-4',
    );
    expect(formatUtilityList('hover:focus:bg-white focus:hover:p-4')).toBe('focus:hover:p-4 hover:focus:bg-white');
    expect(formatUtilityList('hover:p-4 focus:bg-white')).toBe('focus:bg-white hover:p-4');
  });

  it('uses family and group ranks to sort independent utilities within a category', () => {
    expect(formatUtilityList('max-w-sm w-full')).toBe('w-full max-w-sm');
    expect(formatUtilityList('text-red-500 text-sm')).toBe('text-sm text-red-500');
  });

  it('preserves whitespace inside arbitrary values and escaped tokens', () => {
    expect(formatUtilityList("content-['hello  world']   bg-[url('a  b.png')]  p-4")).toBe(
      "content-['hello  world'] p-4 bg-[url('a  b.png')]",
    );
    expect(formatUtilityList('[content:var(--label\\:wide)]   bg-white')).toBe(
      '[content:var(--label\\:wide)] bg-white',
    );
  });

  it('normalizes empty and whitespace-only lists', () => {
    expect(formatUtilityList('')).toBe('');
    expect(formatUtilityList('   \t\n')).toBe('');
    expect(formatUtilityList('  p-2   ')).toBe('p-2');
  });
});
