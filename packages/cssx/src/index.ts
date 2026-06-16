/**
 * A utility record created by the compiler.
 *
 * Do not create this value yourself. A null class name clears related style
 * groups without adding a class name.
 */
export type CompiledUtility = readonly [
  className: string | null,
  scope: string,
  group: string,
  ...conflicts: readonly string[],
];

/** A compiled style that `props` can merge. */
export interface CompiledStyle {
  /** Identifies an object that was produced by the CSSX compiler. */
  readonly $$css: 2;
  /** Composite class used when this style is applied on its own. */
  readonly c: string;
  /** Stores utility records used to merge this compiled style. */
  readonly _: readonly CompiledUtility[];
}

/** A value accepted by `props`. */
export type StyleInput = CompiledStyle | string | false | null | undefined | readonly StyleInput[];

/** A value accepted by `sx`. */
export type SxInput = string | false | null | undefined | readonly SxInput[];

/** A map of style names to compiled styles. */
export type StyleMap<T extends Readonly<Record<string, string>>> = {
  readonly [Key in keyof T]: CompiledStyle;
};

/**
 * Declares static styles for the compiler.
 *
 * @param _styles The named static utility strings to compile.
 * @returns A map of compiled styles.
 *
 * This call throws if it reaches the browser. Configure a compiler plugin
 * before using it.
 */
export function create<T extends Readonly<Record<string, string>>>(_styles: T): StyleMap<T> {
  void _styles;
  throw new Error('cssx.create() must be compiled. Configure @cssxio/babel-plugin or @cssxio/unplugin.');
}

/**
 * Joins class names and ignores empty values.
 *
 * @param inputs Class names, conditions, or nested lists of them.
 * @returns One space-separated class string.
 */
export function sx(...inputs: readonly SxInput[]): string {
  const classes: string[] = [];
  const visit = (input: SxInput): void => {
    if (!input) {
      return;
    }
    if (typeof input === 'string') {
      classes.push(input);
      return;
    }
    for (const value of input) {
      visit(value);
    }
  };
  for (const input of inputs) {
    visit(input);
  }
  return classes.join(' ');
}

/**
 * Merges compiled styles from left to right.
 *
 * @param inputs Compiled styles, raw class strings, or nested lists of them.
 * @returns An object with the final class name.
 *
 * Raw class strings are kept as written. This function throws when an object
 * was not created by the compiler.
 */
export function props(...inputs: readonly StyleInput[]): { readonly className: string } {
  const parts: Array<string | CompiledStyle> = [];
  const records: CompiledUtility[] = [];
  let styleCount = 0;
  const visit = (input: StyleInput): void => {
    if (!input) {
      return;
    }
    if (isStyleArray(input)) {
      for (const value of input) {
        visit(value);
      }
    } else if (typeof input === 'string') {
      parts.push(input);
    } else if (isCompiledStyle(input)) {
      records.push(...input._);
      parts.push(input);
      styleCount++;
    } else {
      throw new Error('cssx.props() received an object that was not compiled by CSSX.');
    }
  };
  for (const input of inputs) {
    visit(input);
  }
  if (styleCount === 1) {
    return {
      className: parts
        .map((part) => (typeof part === 'string' ? part : part.c))
        .filter(Boolean)
        .join(' '),
    };
  }
