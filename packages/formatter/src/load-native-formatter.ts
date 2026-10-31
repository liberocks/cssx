import { createRequire } from 'node:module';
import { resolve } from 'node:path';

/** One static CSSX string literal identified by the native Oxc analyzer. */
export interface NativeCssxFormattingLiteral {
  readonly start: number;
  readonly end: number;
  readonly value: string;
}

/** Optional native API shipped by @cssxio/compiler-native. */
export interface NativeCssxFormatter {
  findCssxFormattingLiterals(source: string, filename: string, importSource?: string): NativeCssxFormattingLiteral[];
}

type NativePackageRequire = (specifier: string) => unknown;
type NativeDlopen = (module: NodeJS.Module & { exports: NativeCssxFormatter }, filename: string) => void;

let formatter: NativeCssxFormatter | null | undefined;

/** Loads the optional native parser, returning undefined when no matching addon is installed. */
export function loadNativeFormatter(
  requirePackage?: NativePackageRequire,
  dlopen: NativeDlopen = process.dlopen,
  moduleRequire?: NativePackageRequire,
): NativeCssxFormatter | undefined {
  if (process.env.CSSX_DISABLE_NATIVE_COMPILER === '1') {
    formatter = null;
    return undefined;
  }
  if (formatter !== undefined) {
    return formatter ?? undefined;
  }

  const configuredPath = process.env.CSSX_NATIVE_COMPILER_PATH;
  if (configuredPath) {
    try {
      const bindingModule = { exports: {} } as NodeJS.Module & { exports: NativeCssxFormatter };
      dlopen(bindingModule, configuredPath);
      if (isNativeCssxFormatter(bindingModule.exports)) {
        formatter = bindingModule.exports;
        return formatter;
      }
    } catch {
      // Fall back to the optional package when a custom native path is invalid.
    }
  }

  const packageResolvers = [
    requirePackage ?? createRequire(resolve(process.cwd(), 'package.json')),
    moduleRequire ?? createRequire(import.meta.url),
  ];
  for (const resolvePackage of packageResolvers) {
    try {
      const packagedFormatter = resolvePackage('@cssxio/compiler-native');
      if (isNativeCssxFormatter(packagedFormatter)) {
        formatter = packagedFormatter;
        return packagedFormatter;
      }
    } catch {
      // The native package is optional and may not include this platform's addon.
    }
  }
  formatter = null;
  return undefined;
}

function isNativeCssxFormatter(value: unknown): value is NativeCssxFormatter {
  return (
    typeof value === 'object' &&
    value !== null &&
    'findCssxFormattingLiterals' in value &&
    typeof value.findCssxFormattingLiterals === 'function'
  );
}

/** Internal state controls for deterministic package tests. */
export const nativeFormatterInternals = {
  reset: () => {
    formatter = undefined;
  },
  isNativeCssxFormatter,
};
