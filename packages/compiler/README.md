# @cssxio/compiler

`@cssxio/compiler` builds static utility strings without a source transform or build tool adapter.

```ts
import { compileStyleMap, serializeCss } from '@cssxio/compiler';

const result = await compileStyleMap({
  card: 'p-5 bg-white hover:bg-gray-50',
});

const className = result.classNames.card;
const css = serializeCss(result.rules, { layer: 'cssx' });
```

## Class names

The style-map compiler APIs accept `className`. By default CSSX uses compact,
collision-free serial names: `s0x`, `s1x`, and so on.

Static style maps also default to `reusabilityBudget: 'auto'`. CSSX shares
positive-value groups of utilities between repeated styles and leaves each
style with a residual class when needed. Set `0` to keep one complete class per
style or `100` to emit only winning atomic classes.

```ts
const result = await compileStyleMap(styles, { reusabilityBudget: 0 });
```

```ts
const result = await compileStyleMap(
  { card: 'p-5 bg-white' },
  {
    className: {
      variant: 'serial',
      prefix: 'app-',
      suffix: '-v1',
    },
  },
);
// Atomic and composite names: app-0-v1, app-1-v1, …, app-z-v1, app-A-v1, …, app-10-v1
```

`serial` is a collision-free, case-sensitive base-62 counter for the complete
compilation: `0` through `9`, then `a` through `z`, then `A` through `Z`, then
`10`. Its default prefix and suffix are `s` and `x` (`s0x`, `s1x`, …). When
both affixes are explicitly blank, CSSX uses decimal serial names and escapes
digit-leading selectors. The `prefix` gives it a project namespace. Choose the stable content-hash `random` variant when that better
fits your build; set
`length` to fix the hash fragment length when you need a smaller output:

```ts
{ className: { variant: 'random', prefix: 'app_', suffix: '_v1', length: 5 } }
// app_0p4jd_v1
```

CSSX resolves collisions deterministically for random names. A fixed random
length must have enough base-36 combinations for every generated atomic and
composite class; otherwise compilation fails instead of reusing a class name.
`length` applies only to `random`, and a non-empty `prefix` must be a safe CSS
identifier prefix. Prefixes and suffixes work with both variants.

When you compile independent maps that share one stylesheet, create one
allocator and pass it as `classNameAllocator` to every call, including
`composeCompiledStyles`. This keeps serial values unique across those calls.

```ts
const classNameAllocator = createClassNameAllocator();
const first = compileStyleRecords({ button: 'p-4' }, { classNameAllocator });
const second = compileStyleRecords({ card: 'bg-white' }, { classNameAllocator });
```

## API

### High-level compilation

- `compileStyleMap(input, options?)` asynchronously compiles one object of style names to static utility strings. It returns `CompileResult`, containing compiled runtime `styles`, one composite class in `classNames` for each style key, internal candidate metadata, and zero or one `CssxRule` with the generated CSS. `options.theme` is optional CSSX `@theme` input.
- `compileStyleMaps(inputs, options?)` asynchronously compiles named style maps together. It returns `CompileMapsResult`, with a `styleMaps` result for each input and shared CSS `rules`. Shared keyframes and property registrations are emitted once.
- `serializeCss(rules, options?)` removes duplicate rule CSS, sorts it for stable output, and joins it into one string. Set `options.layer` to wrap non-empty output in `@layer <layer>{...}`.

### Lower-level compilation

- `compileUtilities(candidates, className, themeCss?)` asynchronously emits CSS for unique utility candidates. `className` is called once per distinct candidate and must return one or more safe, space-separated CSS class names. The result is `UtilityCompilation`: `css` includes everything, `prefixCss` contains theme and shared resources, `entries` lists emitted utility CSS in output order, and `classes` maps candidates to the callback result.
- `describeUtilityRecipe(candidateSource, theme)` returns `UtilityRecipe` for one already-resolved `CssxTheme`. It includes declaration `atoms`, required keyframes and property registrations in `resources`, and atom-level semantic `writes`.
- `compileStyleRecords(input, options?)` returns `CompiledStyleRecordMap` for one static style map. Its `styles` are runtime records, `classes` maps candidates to generated classes, and `candidates` preserves each style's parsed utility list.
- `compileStyleRecordMaps(inputs, options?)` returns `CompiledStyleRecordMaps` for several maps. It uses one class-name namespace and exposes the shared `classes` map.
- `classifyUtility(candidate)` returns a `UtilityConflictRecord` with the candidate's variant `scope`, write `group`, and cleared `conflicts`, or `null` when it cannot be composed safely.
- `mergeCompiledStyles(styles)` applies `CompiledStyle` records from left to right and returns the final class string. Later utilities clear conflicting earlier groups in the same scope.

### Types

- `CompilerOptions` configures high-level compilation. Its optional `theme` is CSSX `@theme` input, `className` controls generated class naming, and `reusabilityBudget` controls static class sharing.
- `StyleCompilerOptions` configures compiled record generation with the same optional `theme`, `className`, and `reusabilityBudget` inputs.
- `ClassNameOptions` defaults to `serial` names with an `s` prefix and `x` suffix. It can select `random` (stable hash), set a shared `prefix` or `suffix`, and set the random hash `length`.
- `ClassNameAllocator` maintains one collision-free naming namespace across independent compiler calls. Create one with `createClassNameAllocator(options?)`.
- `CssxRule` contains a stable generated `className` and its full `css`.
- `CompileResult` contains one map's `styles`, composite `classNames`, `rules`, generated atom `classes`, and parsed `candidates`.
- `CompileMapsResult` contains compiled `styleMaps` and shared `rules`.
- `CompiledStyle` is an opaque ABI-v2 runtime style record marked by `$$css`; `c` stores its composite class and `_` stores ordered `CompiledUtility` fallback records.
- `CompiledUtility` is the compact tuple used by `CompiledStyle`: class name or clear marker, scope, group, then conflict groups.
- `CompiledStyleRecordMap` contains one map's `styles`, candidate `classes`, and parsed `candidates`.
- `CompiledStyleRecordMaps` contains named `styleMaps` and their shared `classes`.
- `UtilityConflictRecord` describes a composable utility's `scope`, primary `group`, and `conflicts`.
- `UtilityDeclaration` is one emitted CSS declaration. It can include selector, at-rule, and semantic metadata for atomization and composition.
- `UtilityCompilation` is the result of `compileUtilities`, with complete `css`, shared `prefixCss`, ordered `entries`, and candidate `classes`.
- `UtilityCssEntry` contains one source `candidate` and the `css` emitted for it.
- `UtilityRecipe` describes one candidate's declaration `atoms`, shared `resources`, and semantic `writes`.
- `UtilityRecipeResources` lists required `keyframes` and registered custom `properties`.
- `UtilityWriteSet` names one atom's semantic `group` and `conflicts`.
- `CssxTheme` is resolved theme data: `tokens`, `keyframes`, output `mode`, and variable `prefix`.
- `ThemeOutputMode` is `inline`, `reference`, or `static`. Inline output writes resolved values in rules; reference output emits used variables; static output emits all theme variables.

`theme` is CSSX `@theme` input added to the default theme. CSSX validates it, resolves token references while building, and rejects invalid declarations, unsafe values, missing tokens, and circular references. Custom color and breakpoint tokens can define utility values without adding global CSS.

## Motion compilation

CSSX emits motion as native CSS declarations and at-rules. Transition and
animation longhands compose independently with shorthands; a later shorthand
resets its components, while a later longhand preserves the earlier shorthand
and overrides only that component. Referenced keyframes come from compiled
recipe declarations and are emitted once.

`motion-safe:` and `motion-reduce:` emit reduced-motion media queries.
`starting:` emits `@starting-style`. Scroll/view timeline, animation range, and
View Transition utilities are wrapped in property-specific feature queries.
`vt-old-[target]:`, `vt-new-[target]:`, `vt-group-[target]:`, and
`vt-image-pair-[target]:` emit terminal pseudo-element selectors intended for a
class on the document element.

The compiler does not add a motion runtime. It does not observe elements,
delay removal, interpret gestures, run spring simulations, project layout, or
initiate View Transition transactions. Spring utilities resolve to static
`linear()` easing tokens.

CSSX keeps property atoms internally when dynamic composition may need to
replace one channel, such as `px-4` followed by `pr-2`. Static style keys and
locally resolvable compositions still expose one composite class.

Historical compatibility references are documented in [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).

# Compiler build integrity

Each compiler build writes `dist/BUILD_MANIFEST.json`. It stores a SHA-256
hash for the source files and each published file. The package check compares
the manifest with the generated files before publishing.
