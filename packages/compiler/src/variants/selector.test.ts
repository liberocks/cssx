import { describe, expect, it } from 'vitest';

import { replaceNestingSelectors } from './selector';

describe('selector AST rewriting', () => {
  it('replaces nesting nodes while preserving quoted, attribute, escaped, and comment ampersands', () => {
    expect(replaceNestingSelectors('&[data-label=\'&\']:is([data-value="&"], &.ready)', '.x-root')).toBe(
      '.x-root[data-label=\'&\']:is([data-value="&"], .x-root.ready)',
    );
    expect(replaceNestingSelectors('&/* & */ > svg', '.x-root')).toBe('.x-root/* & */ > svg');
    expect(replaceNestingSelectors('\\&', '.x-root')).toBeNull();
  });

  it('treats a compact type selector after nesting as a descendant', () => {
    expect(replaceNestingSelectors('&p, &svg:not(.icon), & p, &.ready, &[data-state=open]', '.x-root')).toBe(
      '.x-root p, .x-root svg:not(.icon), .x-root p, .x-root.ready, .x-root[data-state=open]',
    );
    expect(replaceNestingSelectors('&[data-label="&p"]', '.x-root')).toBe('.x-root[data-label="&p"]');
    expect(replaceNestingSelectors('&', '.x-root')).toBe('.x-root');
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

  it('handles escaped and nested attribute delimiters', () => {
    expect(replaceNestingSelectors('&[data-label=\\]value]', '.x-root')).toBe('.x-root[data-label=\\]value]');
    expect(replaceNestingSelectors('&[data-state[open]]', '.x-root')).toBe('.x-root[data-state[open]]');
    expect(replaceNestingSelectors('\\', '.x-root')).toBeNull();
  });
});
