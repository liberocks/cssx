import type { CssxPluginOptions } from './options';
import type { CssxSourceModule } from './stylesheet-types';

/** Structured output explaining CSSX classes and stylesheet coverage. */
export interface CssxDebugReport {
  readonly version: 1;
  readonly naming: { readonly mode: string; readonly reason: string };
  readonly coordination: { readonly mode: string; readonly manifestPath?: string };
  readonly classes: readonly {
    readonly className: string;
    readonly module: string;
    readonly utilities: readonly string[];
    readonly line: number;
    readonly column: number;
    readonly selectorFound: boolean;
  }[];
  readonly serverClientMappings: {
    readonly status: 'manifest-shared' | 'consistent-in-process' | 'mismatch';
    readonly conflicts: readonly string[];
  };
}

/** Builds an inspectable report from transformed module records and emitted CSS. */
export function createCssxDebugReport(
  modules: readonly CssxSourceModule[],
  css: string,
  options: CssxPluginOptions,
): CssxDebugReport {
  const mode =
    options.naming ??
    (options.stableClassNames
      ? 'source'
      : options.className?.variant === 'random'
        ? 'hash'
        : (options.className?.variant ?? 'serial'));
  const reason = options.stableClassNames
    ? 'stableClassNames compatibility option selects source-addressed composites'
    : options.naming
      ? 'explicit naming option'
      : options.className?.variant
        ? 'className.variant option'
        : 'default serial naming';
  const entries = new Map<string, { module: string; utilities: Set<string>; line: number; column: number }>();
  const mappings = new Map<string, Set<string>>();
  for (const module of [...modules].sort((left, right) => left.id.localeCompare(right.id))) {
    const atomsByClass = new Map<string, Set<string>>();
    for (const [utility, className] of Object.entries(module.candidates)) {
      const group = mappings.get(utility) ?? new Set<string>();
      group.add(className);
      mappings.set(utility, group);
      const entry = entries.get(className) ?? {
        module: module.id,
        utilities: new Set<string>(),
        line: module.origins?.[utility]?.line ?? 0,
        column: module.origins?.[utility]?.column ?? 0,
      };
      entry.utilities.add(utility);
      entries.set(className, entry);
      const atoms = atomsByClass.get(className) ?? new Set<string>();
      atoms.add(utility);
      atomsByClass.set(className, atoms);
    }
    for (const [className, atomicClasses] of Object.entries(module.composites ?? {})) {
      const utilities = Object.entries(module.candidates)
        .filter(([, atom]) => atomicClasses.includes(atom))
        .map(([utility]) => utility);
      entries.set(className, {
        module: module.id,
        utilities: new Set(utilities),
        line: utilities.length ? (module.origins?.[utilities[0]!]?.line ?? 0) : 0,
        column: utilities.length ? (module.origins?.[utilities[0]!]?.column ?? 0) : 0,
      });
    }
    for (const className of module.atomicClasses ?? []) {
      if (!entries.has(className)) {
        entries.set(className, { module: module.id, utilities: new Set(), line: 0, column: 0 });
      }
    }
  }
  const classes = [...entries]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([className, entry]) => ({
      className,
      module: entry.module,
      utilities: [...entry.utilities].sort(),
      line: entry.line + 1,
      column: entry.column + 1,
      selectorFound: new RegExp(`\\.${escapeRegExp(className)}(?:[^A-Za-z0-9_-]|$)`).test(css),
    }));
  const conflicts = [...mappings]
    .filter(([, names]) => names.size > 1)
    .map(([utility]) => utility)
    .sort();
  return {
    version: 1,
    naming: { mode, reason },
    coordination: {
      mode: options.coordination ?? 'memory',
      ...(options.coordination === 'manifest' && options.manifestPath ? { manifestPath: options.manifestPath } : {}),
    },
    classes,
    serverClientMappings: {
      status:
        conflicts.length > 0
          ? 'mismatch'
          : options.coordination === 'manifest'
            ? 'manifest-shared'
            : 'consistent-in-process',
      conflicts,
    },
  };
}

/** Escapes a generated class name for literal selector matching. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
