import { compileStyleRecords, parseTheme } from '@cssxio/compiler';
import { compileCandidates } from './compile-candidates';
import type { NativeCompilerOptions, NativeStyleMap } from './native-types';

/**
 * Compiles static utility maps to React Native-compatible style records.
 *
 * @param styles Named static utility strings.
 * @param options Target platform and optional theme.
 * @returns Compiled native style records.
 */
export function create<T extends Readonly<Record<string, string>>>(
  styles: T,
  options: NativeCompilerOptions = {},
): NativeStyleMap<T> {
  const records = compileStyleRecords(styles, { theme: options.theme });
  const theme = parseTheme(options.theme);
  return Object.fromEntries(
    Object.entries(records.candidates).map(([name, candidates]) => [
      name,
      { $$cssx: 3, style: compileCandidates(candidates, theme, options.platform) },
    ]),
  ) as NativeStyleMap<T>;
}
