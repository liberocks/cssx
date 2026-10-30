import MagicString from 'magic-string';

import type { TransformResult } from './transform-cssx-module';

/** One replacement range using JavaScript UTF-16 string offsets. */
export interface SourceEdit {
  readonly start: number;
  readonly end: number;
  readonly content: string;
}

/** Applies source replacements and returns mappings from generated code to the input module. */
export function applySourceEdits(
  source: string,
  sourceId: string,
  edits: readonly SourceEdit[],
): { readonly code: string; readonly map: NonNullable<TransformResult['map']> } {
  const magicString = new MagicString(source);
  for (const edit of [...edits].sort((left, right) => left.start - right.start)) {
    magicString.overwrite(edit.start, edit.end, edit.content);
  }
  const map = JSON.parse(
    magicString.generateMap({ hires: true, includeContent: true, source: sourceId }).toString(),
  ) as NonNullable<TransformResult['map']>;
  return { code: magicString.toString(), map };
}
