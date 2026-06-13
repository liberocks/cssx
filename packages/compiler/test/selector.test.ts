import { describe, expect, it } from 'vitest';
import { replaceNestingSelectors } from '../src/selector';

describe('selector AST rewriting', () => {
  it('replaces nesting nodes while preserving quoted, attribute, escaped, and comment ampersands', () => {
    expect(replaceNestingSelectors('&[data-label=\'&\']:is([data-value="&"], &.ready)', '.x-root')).toBe(
      '.x-root[data-label=\'&\']:is([data-value="&"], .x-root.ready)',
    );
    expect(replaceNestingSelectors('&/* & */ > svg', '.x-root')).toBe('.x-root/* & */ > svg');
    expect(replaceNestingSelectors('\\&', '.x-root')).toBeNull();
  });

  it('rejects unterminated attribute, string, and comment syntax', () => {
    expect(() => replaceNestingSelectors('&[data-label', '.x-root')).toThrow('attribute');
    expect(() => replaceNestingSelectors('&[data-label="open]', '.x-root')).toThrow('string');
    expect(() => replaceNestingSelectors('&/* comment', '.x-root')).toThrow('comment');
  });

  it('preserves escaped quotes and nested attributes while rewriting nesting selectors', () => {
    expect(replaceNestingSelectors('&[data-label="a\\" &"][data-state] "\\"&"', '.x-root')).toBe(
      '.x-root[data-label="a\\" &"][data-state] "\\"&"',
    );
  });
});
