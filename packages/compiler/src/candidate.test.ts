import { describe, expect, it } from 'vitest';
import { candidateScope, parseCandidate, splitCandidateList } from '../src/candidate';
import { classifyCandidate } from '../src/semantics';

describe('CSSX candidate parsing', () => {
  it('keeps arbitrary values intact while splitting a static utility list', () => {
    expect(splitCandidateList("bg-[url('image with spaces.svg')] p-4")).toEqual([
      "bg-[url('image with spaces.svg')]",
      'p-4',
    ]);
  });

  it('drops whitespace-only list segments', () => {
    expect(splitCandidateList('   \n\t ')).toEqual([]);
  });

  it('normalizes commutative state variants but preserves selector-sensitive order', () => {
    expect(parseCandidate('hover:focus:p-4')).toMatchObject({ variants: ['focus', 'hover'], utility: 'p-4' });
    expect(parseCandidate('before:hover:p-4')).toMatchObject({ variants: ['before', 'hover'], utility: 'p-4' });
  });

  it('records important and negative modifiers separately from the utility root', () => {
    expect(parseCandidate('sm:!-mt-2')).toMatchObject({
      variants: ['sm'],
      important: true,
      negative: true,
      utility: 'mt-2',
    });
    expect(parseCandidate('sm:-mt-2!')).toMatchObject({
      variants: ['sm'],
      important: true,
      negative: true,
      utility: 'mt-2',
    });
    expect(classifyCandidate('sm:!p-4')).toEqual(classifyCandidate('sm:p-4!'));
    expect(() => parseCandidate('!!p-4')).toThrow('Invalid utility');
  });

  it('rejects top-level CSS injection syntax', () => {
    expect(() => parseCandidate('p-4;body{display:none}')).toThrow('Invalid utility');
    expect(() => parseCandidate('bg-[red];body{display:none}')).toThrow('Invalid utility');
    expect(() => parseCandidate('bg-[red;color:blue]')).toThrow('Invalid utility');
    expect(() => parseCandidate('has-[input]{display:none}:block')).toThrow('Invalid utility');
  });

  it('rejects overly large or deeply nested static input before compilation', () => {
    expect(() => splitCandidateList('p-4 '.repeat(4_097))).toThrow('16 KiB limit');
    expect(() => parseCandidate(`${'['.repeat(33)}value${']'.repeat(33)}`)).toThrow('Invalid utility');
  });

  it('uses one CSSX-owned semantic description for utility composition', () => {
    expect(classifyCandidate('p-4')).toMatchObject({ group: 'p', conflicts: expect.arrayContaining(['px', 'pr']) });
    expect(classifyCandidate('[paint-order:markers]')).toMatchObject({ group: 'arbitrary..paint-order' });
  });

  it('preserves quoted delimiters while rejecting incomplete syntax', () => {
    expect(splitCandidateList('content-["a b"] before:content-["a b"] p-4')).toEqual([
      'content-["a b"]',
      'before:content-["a b"]',
      'p-4',
    ]);
    expect(parseCandidate('print:focus:!p-4').variants).toEqual(['print', 'focus']);
    expect(candidateScope(parseCandidate('print:!p-4'))).toBe('print!');
    expect(candidateScope(parseCandidate('!p-4'))).toBe('!');

    for (const source of ['p-4:', ':p-4', 'p-[value', 'p-(value', 'p-["value]', 'p-[value\\']) {
      expect(() => parseCandidate(source)).toThrow('Invalid utility');
    }
    expect(() => splitCandidateList('p-4]')).toThrow('Invalid utility list');
    expect(() => splitCandidateList('p-4)')).toThrow('Invalid utility list');
  });

  it('accepts escaped characters inside quoted arbitrary values', () => {
    expect(splitCandidateList('content-["a\\" b"] bg-[url("a\\ b.svg")]')).toEqual([
      'content-["a\\" b"]',
      'bg-[url("a\\ b.svg")]',
    ]);
    expect(parseCandidate('before:content-["a\\" b"]').utility).toBe('content-["a\\" b"]');
  });

  it('rejects malformed modifier and trailing escape forms', () => {
    expect(() => parseCandidate('')).toThrow('Invalid utility');
    expect(() => parseCandidate('!p-4!')).toThrow('Invalid utility');
    expect(() => splitCandidateList('p-4\\')).toThrow('Invalid utility list');
  });

  it('classifies malformed arbitrary properties and text alignment precisely', () => {
    expect(classifyCandidate('[123:value]')).toBeNull();
    expect(classifyCandidate('text-left')).toMatchObject({ group: 'text-align' });
  });
});
