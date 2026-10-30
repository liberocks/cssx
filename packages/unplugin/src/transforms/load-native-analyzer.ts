import { createRequire } from 'node:module';
import { resolve } from 'node:path';

import type { NativeCssxAnalyzer } from './native-static-sx';

/** The package loader needed to load an optional platform-specific native binding. */
interface NativePackageRequire {
  (specifier: string): unknown;
}

/** Loads one Node-API binary into a fresh module object. */
type NativeDlopen = (module: NodeJS.Module & { exports: NativeCssxAnalyzer }, filename: string) => void;

/** Resolves the optional Rust addon once, falling back when no compatible binary is installed. */
export function loadNativeAnalyzer(
  requirePackage?: NativePackageRequire,
  dlopen: NativeDlopen = process.dlopen,
  moduleRequire?: NativePackageRequire,
): NativeCssxAnalyzer | undefined {
  if (process.env.CSSX_DISABLE_NATIVE_COMPILER === '1') {
    analyzer = null;
    return requiredNativeAnalyzer();
  }
  if (analyzer !== undefined) {
    if (analyzer) {
      return analyzer;
    }
    return requiredNativeAnalyzer();
  }
  const configuredPath = process.env.CSSX_NATIVE_COMPILER_PATH;
  if (configuredPath) {
    try {
      const bindingModule = { exports: {} } as NodeJS.Module & { exports: NativeCssxAnalyzer };
      dlopen(bindingModule, configuredPath);
      analyzer = bindingModule.exports;
      return bindingModule.exports;
    } catch {
      // Fall back to the optional package and then to a local development build.
    }
  }

  const packageResolvers = [
    requirePackage ?? createRequire(resolve(process.cwd(), 'package.json')),
    moduleRequire ?? createRequire(import.meta.url),
  ];
  for (const resolvePackage of packageResolvers) {
    try {
      const packagedAnalyzer = resolvePackage('@cssxio/compiler-native');
      if (isNativeCssxAnalyzer(packagedAnalyzer)) {
        analyzer = packagedAnalyzer;
        return packagedAnalyzer;
      }
    } catch {
      // The native addon is an optional package on platforms without a matching build.
    }
  }
  const nativeTarget = resolve(process.cwd(), 'packages/compiler/native/target');
  const modulePaths = [
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
  return requiredNativeAnalyzer();
}

/** Fails the native-only benchmark instead of silently measuring the fallback. */
function requiredNativeAnalyzer(): undefined {
  if (process.env.CSSX_REQUIRE_NATIVE_COMPILER === '1') {
    throw new Error('CSSX_REQUIRE_NATIVE_COMPILER=1, but no compatible native compiler addon could be loaded.');
  }
  return undefined;
}

/** Narrows an optional package export to the analyzer interface. */
function isNativeCssxAnalyzer(value: unknown): value is NativeCssxAnalyzer {
  return (
    typeof value === 'object' && value !== null && 'findCssxCalls' in value && typeof value.findCssxCalls === 'function'
  );
}

/** The native analyzer binding, cached after the first lookup. */
let analyzer: NativeCssxAnalyzer | null | undefined;
