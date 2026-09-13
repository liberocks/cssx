/** A utility record created by the compiler. */
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
