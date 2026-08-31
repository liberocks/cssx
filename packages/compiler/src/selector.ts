/** Parsed selector segment that preserves quoted and attribute content. */
type SelectorNode =
  { readonly type: 'attribute' | 'comment' | 'string' | 'text'; readonly value: string } | { readonly type: 'nesting' };

/** Minimal selector representation used to replace actual nesting nodes only. */
interface SelectorAst {
  /** Parsed selector segments in source order. */
  readonly nodes: readonly SelectorNode[];
  /** Whether the selector includes a real nesting node. */
  readonly hasNesting: boolean;
}

/**
 * Replaces CSS nesting nodes without touching quoted or attribute content.
 *
 * @param selector Arbitrary selector source.
 * @param replacement Selector text that replaces nesting nodes.
 * @returns Rewritten selector, or null when no nesting node exists.
 */
export function replaceNestingSelectors(selector: string, replacement: string): string | null {
  const ast = parseSelector(selector);
  if (!ast.hasNesting) {
    return null;
  }
  return ast.nodes.map((node) => (node.type === 'nesting' ? replacement : node.value)).join('');
}

/**
 * Parses only the selector syntax needed to locate real nesting nodes.
 *
 * @param selector Selector source to scan.
 * @returns Parsed selector segments.
 */
function parseSelector(selector: string): SelectorAst {
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
      const end = readAttributeEnd(selector, index);
      nodes.push({ type: 'attribute', value: selector.slice(index, end + 1) });
      index = end;
      continue;
    }
    if (character === '"' || character === "'") {
      pushText();
      const end = readStringEnd(selector, index, character);
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

/**
 * Finds the matching end of an attribute selector.
 *
 * @param selector Selector source.
 * @param start Opening bracket position.
 * @returns Closing bracket position.
 */
function readAttributeEnd(selector: string, start: number): number {
  let depth = 1;
  for (let index = start + 1; index < selector.length; index++) {
    const character = selector[index];
    if (character === '\\') {
      index++;
      continue;
    }
    if (character === '"' || character === "'") {
      index = readStringEnd(selector, index, character);
      continue;
    }
    if (character === '[') {
      depth++;
    }
    if (character === ']') {
      depth--;
    }
    if (depth === 0) {
      return index;
    }
  }
  throw new Error('Invalid CSSX arbitrary selector attribute.');
}

/**
 * Finds the end of an escaped CSS string.
 *
 * @param selector Selector source.
 * @param start Opening quote position.
 * @param quote Opening quote character.
 * @returns Closing quote position.
 */
function readStringEnd(selector: string, start: number, quote: string): number {
  for (let index = start + 1; index < selector.length; index++) {
    if (selector[index] === '\\') {
      index++;
      continue;
    }
    if (selector[index] === quote) {
      return index;
    }
  }
  throw new Error('Invalid CSSX arbitrary selector string.');
}
