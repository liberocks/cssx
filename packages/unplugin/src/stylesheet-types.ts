/** The source location of one utility string. */
export interface CssxCandidateOrigin {
  /** Zero-based line number in the source module. */
  readonly line: number;
  /** Zero-based column number in the source module. */
  readonly column: number;
}

/** CSSX data collected from one source module. */
export interface CssxSourceModule {
  /** Stable source module ID. */
  readonly id: string;
  /** Maps utility strings to generated class names. */
  readonly candidates: Readonly<Record<string, string>>;
  /** Maps composite classes to their winning atomic classes. */
  readonly composites?: Readonly<Record<string, readonly string[]>>;
  /** Atomic classes required by compiled styles that survive to runtime. */
  readonly atomicClasses?: readonly string[];
  /** Maps utility strings to source locations when they are available. */
  readonly origins?: Readonly<Record<string, CssxCandidateOrigin>>;
}

/** A source map for generated CSS. */
export interface CssxSourceMap {
  /** Source map format version. */
  readonly version: 3;
  /** Source module IDs referenced by the map. */
  readonly sources: readonly string[];
  /** CSSX does not emit named source map entries. */
  readonly names: readonly [];
  /** Encoded source map segments for generated rules. */
  readonly mappings: string;
}

/** A generated stylesheet and its optional source map. */
export interface CssxStylesheet {
  /** Generated, deduplicated CSS. */
  readonly css: string;
  /** Source map for generated CSS when source locations are available. */
  readonly map?: CssxSourceMap;
}

/** Generated CSS location used while constructing source maps. */
export interface CssxCssLocation {
  /** Zero-based generated CSS line. */
  readonly line: number;
  /** Zero-based generated CSS column. */
  readonly column: number;
}

/** A compiled utility's emitted CSS and source candidate. */
export interface CssxCompiledEntry {
  /** Source utility candidate represented by this entry. */
  readonly candidate: string;
  /** Emitted CSS for the utility. */
  readonly css: string;
}

/** Source location with its owning source module ID. */
export interface CssxSourceOrigin extends CssxCandidateOrigin {
  /** Stable source module ID. */
  readonly id: string;
}

/** Encoded mapping point between generated CSS and original source. */
export interface CssxSourceMapPoint extends CssxCssLocation {
  /** Index of the original source in the source map source list. */
  readonly source: number;
  /** Zero-based original source line. */
  readonly originalLine: number;
  /** Zero-based original source column. */
  readonly originalColumn: number;
}
