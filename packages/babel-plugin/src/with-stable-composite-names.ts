import type { CompiledStyle, CompiledStyleRecordMap } from '@cssxio/compiler';
import { atomicClassesForStyle } from './atomic-classes-for-style';
import { stableCompositeName } from './stable-composite-name';

/** Replaces content-addressed composites with source-addressed development names. */
export function withStableCompositeNames(
  result: CompiledStyleRecordMap,
  fileName: string,
  anchor: string,
): CompiledStyleRecordMap {
  const styles: Record<string, CompiledStyle> = Object.create(null) as Record<string, CompiledStyle>;
  const classNames: Record<string, string> = Object.create(null) as Record<string, string>;
  const composites: Record<string, readonly string[]> = Object.create(null) as Record<string, readonly string[]>;
  for (const [name, style] of Object.entries(result.styles)) {
    const className = stableCompositeName(fileName, undefined, `${anchor}:style:${name}`);
    styles[name] = { ...style, c: className };
    classNames[name] = className;
    composites[className] = atomicClassesForStyle(style);
  }
  return { ...result, styles, classNames, composites };
}
