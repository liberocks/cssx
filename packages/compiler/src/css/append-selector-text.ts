import type { SelectorNode } from '../variants/parse-selector';

/** Appends a text segment to selector nodes when the buffer is nonempty. */
export function appendSelectorText(nodes: SelectorNode[], text: string): void {
  if (text) {
    nodes.push({ type: 'text', value: text });
  }
}
