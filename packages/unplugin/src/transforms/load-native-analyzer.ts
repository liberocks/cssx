import { createRequire } from 'node:module';
import { resolve } from 'node:path';

import type { NativeCssxAnalyzer } from './native-static-sx';

/** The package resolver needed to locate an optional native binding. */
interface NativePackageRequire {
  resolve(specifier: string): string;
}

/** Loads one Node-API binary into a fresh module object. */
type NativeDlopen = (module: NodeJS.Module & { exports: NativeCssxAnalyzer }, filename: string) => void;

/** Resolves the optional Rust addon once, falling back when no compatible binary is installed. */
export function loadNativeAnalyzer(
  requirePackage: NativePackageRequire = createRequire(resolve(process.cwd(), 'package.json')),
  dlopen: NativeDlopen = process.dlopen,
): NativeCssxAnalyzer | undefined {
  if (analyzer !== undefined) {
    return analyzer ?? undefined;
  }
  if (process.env.CSSX_DISABLE_NATIVE_COMPILER === '1') {
    analyzer = null;
    return undefined;
  }

  let packagedBinding: string | undefined;
  try {
    packagedBinding = requirePackage.resolve('@cssxio/compiler-native');
  } catch {
    // The native addon is an optional package on platforms without a matching build.
  }
  const nativeTarget = resolve(process.cwd(), 'packages/compiler/native/target');
  const modulePaths = [
    process.env.CSSX_NATIVE_COMPILER_PATH,
    packagedBinding,
    resolve(nativeTarget, 'release/libcssx_compiler_node.dylib'),
    resolve(nativeTarget, 'debug/libcssx_compiler_node.dylib'),
    resolve(nativeTarget, 'release/libcssx_compiler_node.so'),
    resolve(nativeTarget, 'debug/libcssx_compiler_node.so'),
    resolve(nativeTarget, 'release/cssx_compiler_node.dll'),
    resolve(nativeTarget, 'debug/cssx_compiler_node.dll'),
  ].filter((path): path is string => Boolean(path));

  for (const path of modulePaths) {
    try {
      const bindingModule = { exports: {} } as NodeJS.Module & { exports: NativeCssxAnalyzer };
      dlopen(bindingModule, path);
      analyzer = bindingModule.exports;
      return bindingModule.exports;
    } catch {
      // Native builds are optional; the existing Babel transform remains the fallback.
    }
  }
  analyzer = null;
  return undefined;
}

/** The native analyzer binding, cached after the first lookup. */
let analyzer: NativeCssxAnalyzer | null | undefined;
