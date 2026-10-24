/** Resolved theme data used while compiling utilities. */
export interface CssxTheme {
  /** Token values, including default values and user overrides. */
  readonly tokens: Readonly<Record<string, string>>;
  /** Complete keyframe rules keyed by animation name. */
  readonly keyframes: Readonly<Record<string, string>>;
  /** Controls whether utility values are inlined or emitted as variables. */
  readonly mode: ThemeOutputMode;
  /** Optional variable prefix used by reference output. */
  readonly prefix: string;
}

/** Controls how resolved theme tokens appear in generated CSS. */
export type ThemeOutputMode = 'inline' | 'reference' | 'static';
