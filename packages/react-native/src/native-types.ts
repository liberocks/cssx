/** Platforms represented by React Native-specific utility variants. */
export type NativePlatform = 'android' | 'ios';
/** One React Native transform record. */
export type NativeTransform = Readonly<Record<string, number | string>>;
/** A value accepted by React Native's style object. */
export type NativeStyleValue = number | string | readonly NativeTransform[];
/** A React Native style object emitted by CSSX. */
export type NativeStyle = Readonly<Record<string, NativeStyleValue>>;

/** Options used when CSSX compiles utilities for React Native. */
export interface NativeCompilerOptions {
  readonly platform?: NativePlatform;
  readonly theme?: string;
}

/** A compiled React Native style value. */
export interface CompiledNativeStyle {
  readonly $$cssx: 3;
  readonly style: NativeStyle;
}

/** A value accepted by the React Native `props` helper. */
export type NativeStyleInput = CompiledNativeStyle | false | null | undefined | readonly NativeStyleInput[];
/** A value accepted by the React Native `sx` helper. */
export type NativeSxInput = string | NativeStyleInput;
/** A map of CSSX names to compiled React Native styles. */
export type NativeStyleMap<T extends Readonly<Record<string, string>>> = {
  readonly [Key in keyof T]: CompiledNativeStyle;
};
