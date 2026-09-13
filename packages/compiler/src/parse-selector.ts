import { readSelectorAttributeEnd } from './read-selector-attribute-end';
import { readSelectorStringEnd } from './read-selector-string-end';

/** Parsed selector segment that preserves quoted and attribute content. */
export type SelectorNode =
  { readonly type: 'attribute' | 'comment' | 'string' | 'text'; readonly value: string } | { readonly type: 'nesting' };

/** Minimal selector representation used to replace actual nesting nodes only. */
export interface SelectorAst {
  /** Parsed selector segments in source order. */
  readonly nodes: readonly SelectorNode[];
  /** Whether the selector includes a real nesting node. */
  readonly hasNesting: boolean;
}

/**
 * Parses only the selector syntax needed to locate real nesting nodes.
 *
 * @param selector Selector source to scan.
 * @returns Parsed selector segments.
 */
export function parseSelector(selector: string): SelectorAst {
  const nodes: SelectorNode[] = [];
  let text = '';
  let hasNesting = false;

  const pushText = () => {
    if (text) {
      nodes.push({ type: 'text', value: text });
    }
    text = '';
  };

  for (let index = 0; index < selector.length; index++) {
    const character = selector[index];
    if (character === '\\') {
      text += `${character}${selector[index + 1] ?? ''}`;
      index++;
      continue;
    }
    if (character === '&') {
      pushText();
      nodes.push({ type: 'nesting' });
      hasNesting = true;
      continue;
    }
    if (character === '[') {
      pushText();
      const end = readSelectorAttributeEnd(selector, index);
      nodes.push({ type: 'attribute', value: selector.slice(index, end + 1) });
      index = end;
      continue;
    }
    if (character === '"' || character === "'") {
      pushText();
      const end = readSelectorStringEnd(selector, index, character);
      nodes.push({ type: 'string', value: selector.slice(index, end + 1) });
      index = end;
      continue;
    }
    if (character === '/' && selector[index + 1] === '*') {
      pushText();
      const end = selector.indexOf('*/', index + 2);
      if (end === -1) {
        throw new Error('Invalid CSSX arbitrary selector comment.');
      }
      nodes.push({ type: 'comment', value: selector.slice(index, end + 2) });
      index = end + 1;
      continue;
    }
    text += character;
  }
  pushText();
  return { nodes, hasNesting };
}
