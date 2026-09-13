import type { StyleMap } from './types';

/**
 * Declares static styles for the compiler.
 *
 * @param _styles The named static utility strings to compile.
 * @returns A map of compiled styles.
 */
export function create<T extends Readonly<Record<string, string>>>(_styles: T): StyleMap<T> {
  void _styles;
  throw new Error('cssx.create() must be compiled. Configure @cssxio/babel-plugin or @cssxio/unplugin.');
}
