import { readThemeBalancedBlock } from './read-theme-balanced-block';
import { skipThemeWhitespaceAndComments } from './skip-theme-whitespace-and-comments';
import { validateKeyframeBody } from './validate-keyframe-body';

/**
 * Removes keyframe rules from a theme block and stores their validated CSS.
 *
 * @param block Theme block content.
 * @param keyframes Mutable keyframe store to update.
 * @returns Remaining declaration source.
 */
export function extractThemeKeyframes(block: string, keyframes: Record<string, string>): string {
  let declarations = '';
  let index = 0;
  while (index < block.length) {
    if (block.startsWith('@keyframes', index)) {
      index += '@keyframes'.length;
      index = skipThemeWhitespaceAndComments(block, index);
      const nameStart = index;
      while (index < block.length && /[a-z0-9_-]/i.test(block[index]!)) {
        index++;
      }
      const name = block.slice(nameStart, index);
      if (!/^[a-z_][a-z0-9_-]*$/i.test(name)) {
        throw new Error('Invalid CSSX @keyframes name.');
      }
      index = skipThemeWhitespaceAndComments(block, index);
      if (block[index] !== '{') {
        throw new Error(`Expected "{" after @keyframes ${name}.`);
      }
      const frameBlock = readThemeBalancedBlock(block, index);
      validateKeyframeBody(frameBlock.content, name);
      keyframes[name] = `@keyframes ${name}{${frameBlock.content}}`;
      index = frameBlock.end;
      continue;
    }
    declarations += block[index]!;
    index++;
  }
  return declarations;
}
