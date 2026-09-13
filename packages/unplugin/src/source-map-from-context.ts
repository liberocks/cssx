/** A source map accepted from a build tool. */
export interface IncomingSourceMap {
  /** Source map format version. CSSX accepts version 3. */
  readonly version: number;
  /** Source file names referenced by the map. */
  readonly sources: string[];
  /** Original identifier names referenced by the map. */
  readonly names: string[];
  /** Optional prefix for source file names. */
  readonly sourceRoot?: string;
  /** Optional source file contents. */
  readonly sourcesContent?: string[];
  /** Encoded source map segments. */
  readonly mappings: string;
  /** Name of the generated file. */
  readonly file: string;
}

/**
 * Reads a source map from a build tool transform context.
 *
 * @param context A build tool transform context.
 * @param id The source module ID.
 * @returns A source map, when the context provides a compatible one.
 */
export function sourceMapFromContext(context: unknown, id: string): IncomingSourceMap | undefined {
  if (!context || typeof context !== 'object') {
    return undefined;
  }
  const getCombinedSourcemap = (context as { readonly getCombinedSourcemap?: unknown }).getCombinedSourcemap;
  if (typeof getCombinedSourcemap !== 'function') {
    return undefined;
  }
  const sourceMap = getCombinedSourcemap.call(context);
  if (!sourceMap || typeof sourceMap !== 'object') {
    return undefined;
  }
  const map = sourceMap as Partial<IncomingSourceMap>;
  if (map.version !== 3 || !Array.isArray(map.sources) || typeof map.mappings !== 'string') {
    return undefined;
  }
  return {
    version: map.version,
    sources: [...map.sources],
    names: [...(map.names ?? [])],
    mappings: map.mappings,
    file: map.file ?? id.split('?', 1).join(''),
    ...(map.sourceRoot ? { sourceRoot: map.sourceRoot } : {}),
    ...(map.sourcesContent ? { sourcesContent: [...map.sourcesContent] } : {}),
  };
}
