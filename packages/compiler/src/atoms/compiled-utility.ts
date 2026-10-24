/**
 * A utility record created by the compiler.
 *
 * A null class name clears related style groups without adding CSS.
 */
export type CompiledUtility = readonly [
  className: string | null,
  scope: string,
  group: string,
  ...conflicts: readonly string[],
];
