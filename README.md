Warning: truncated output (original token count: 24686)
Total output lines: 1337

# CSSX

CSSX turns static utility strings into class names and CSS when you build your app. It keeps a small helper in the browser for styles that change at runtime.

## Packages

| Package                                                   | Purpose                                                |
| --------------------------------------------------------- | ------------------------------------------------------ |
| [`@cssxio/cssx`](packages/cssx/README.md)                 | The `create`, `props`, and `sx` runtime API.           |
| [`@cssxio/html`](packages/html/README.md)                 | Zero-build runtime styling for ordinary HTML.          |
| [`@cssxio/compiler`](packages/compiler/README.md)         | Static utility compilation and CSS output.             |
| [`@cssxio/formatter`](packages/formatter/README.md)       | CSSX-aware utility ordering and whitespace formatting. |
| [`@cssxio/babel-plugin`](packages/babel-plugin/README.md) | Source transform for static CSSX calls.                |
| [`@cssxio/unplugin`](packages/unplugin/README.md)         | Build tool adapters that create the CSS file.          |
| [`@cssxio/react-native`](packages/react-native/README.md) | Native style objects for React Native and Expo.        |
| [`cssx-intellisense`](packages/intellisense/README.md)    | Editor completion and hover help for static utilities. |
| [`@cssxio/docs`](packages/docs)                           | The CSSX documentation site.                           |

Install the runtime plus a compiler integration:

```sh
pnpm add @cssxio/cssx
pnpm add -D @cssxio/unplugin
```

## Raw HTML

For a plain HTML page with no build step, load the default-theme runtime from a CDN. It scans the classes present when the page loads, adds the matching CSSX rules to the document, and leaves every class attribute unchanged.

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width" />
    <script defer src="https://cdn.jsdelivr.net/npm/@cssxio/html@0.2.0/dist/cssx.global.js"></script>
  </head>
  <body class="min-h-screen bg-slate-950 p-6 text-white">
    <main class="mx-auto max-w-xl rounded-lg bg-white p-6 text-slate-950 shadow-lg">
      CSSX styles this ordinary HTML.
    </main>
  </body>
</html>
```

The CDN runtime includes the default CSSX theme. It ignores custom classes such as `htmx-indicator` and `app-card`, and it does not process content inserted after the initial page load. To use custom `@theme` tokens, bundle `start({ theme })` from `@cssxio/html` and host that script yourself. See the [raw HTML example](examples/html) and the [package README](packages/html/README.md).

For bare React Native or Expo, install the native package instead:

```sh
pnpm add @cssxio/react-native
```

```js
// babel.config.js
module.exports = {
  presets: ['module:@react-native/babel-preset'], // use babel-preset-expo in Expo
  plugins: ['@cssxio/react-native/babel'],
};
```

The native compiler turns static utilities into React Native style objects. It
supports native-mappable layout, spacing, sizing, color, typography, border,
and transform utilities plus `ios:` and `android:` variants. It fails at build
time for browser-only selectors, media queries, grid, tables, filters, masks,
CSS variables, and other values React Native cannot represent. See the
[`create`, `props`, and `sx` native API](packages/react-native/README.md), the
[bare React Native example](examples/react-native), and the [Expo example](examples/expo).

Electron renderers use the normal web packages and build adapter. The
[Electron example](examples/electron) combines Vite with a context-isolated,
sandboxed renderer and includes a production launch smoke test.

## Static API

```ts
import * as cssx from '@cssxio/cssx';

const styles = cssx.create({
  button:
    'inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700',
  disabled: 'opacity-50',
});

const buttonProps = cssx.props(styles.button, isDisabled && styles.disabled);
```

Use `sx` for inline class values. CSSX builds static utility strings. Dynamic values stay as a small runtime string join:

```tsx
import { sx } from '@cssxio/cssx';

<button
  className={sx(
    'inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white',
    isDisabled && 'opacity-50',
  )}
/>;
```

`create` accepts one plain object. Its values must be string literals or local constants that hold string literals. The compiler replaces the call. If `create` runs in the browser, the compiler plugin is missing.

Each style key compiles to one composite CSSX class. A locally resolvable static
`props` or `sx` call also folds to one composite class, even when its utility
string contains many declarations. CSSX retains property-level atoms only as a
fallback for combinations that depend on runtime conditions.

`props` accepts compiled styles, nested arrays, empty values, and raw class strings. It applies compiled styles from left to right. Static `props` calls can be replaced during the build.

`sx` accepts static utility strings, nested arrays, and conditional strings. CSSX builds the static utilities. Dynamic calls only join strings at runtime.

CSSX keeps raw strings as written. It does not check or merge the classes inside them.

## Format CSSX utilities

Install the formatter in your development dependencies and run it before your
source formatter:

```sh
pnpm add -D @cssxio/formatter
pnpm exec cssx-format --write .
```

The formatter recognizes imported `sx`, `create`, and `props` calls from
`@cssxio/cssx`, including aliases and namespace imports. It sorts inline
utility strings in this order: layout and positioning, flex/grid/alignment,
sizing, spacing, typography, borders and radii, backgrounds, effects,
transforms and motion, then interaction and accessibility. Responsive and
state variants follow the CSSX compiler's variant order and come after base
utilities.

Utilities that can write overlapping CSS properties keep their source order,
including directional conflicts such as `p-4 px-2`. Duplicates remain in
place. Unknown or ambiguous utilities form sorting boundaries. Whitespace
between utility tokens becomes one space; spaces inside bracketed values,
quoted values, escapes, and Unicode text are preserved. Shared constants and
interpolated templates are left alone. A parse error reports a diagnostic and
leaves that file unchanged.

`cssx-format` accepts files, directories, and glob patterns. It defaults to the
current directory, writes by default, and supports `--write`, `--check`, and
`--ignore-path <file>`. The default ignore file is `.cssxformatignore`; its
non-empty, non-comment lines are glob patterns. The JavaScript API exports
`formatUtilityList(value)` and
`formatSource(source, { filename, importSource? })`. Oxfmt or Prettier can run
afterward for JavaScript/TypeScript layout and import ordering. The complete
CSSX utility reference and supported class families are listed in
[Utility Support](#utility-support).

The formatter uses the optional Rust/Oxc analyzer from
`@cssxio/compiler-native` when a compatible platform binary is installed. It
only parses source and finds literal ranges; utility ordering still comes from
the CSSX TypeScript compiler metadata and sorter. Other platforms and older
native packages fall back to the existing Oxc JavaScript parser. To measure a
cold CSSX-only workspace check, run
`/usr/bin/time -p pnpm exec cssx-format --check .`. The reference target is
under one second on the roughly 674-file Overmost workspace; Oxfmt and Prettier
are measured separately. The CLI uses one sequential worker to keep memory and
CPU use bounded. On the local macOS arm64 machine, new-process checks measured
0.96 s and 1.21 s with the native analyzer, versus 9.38 s with the JavaScript
parser fallback. Filesystem cache state and machine load affect these results.

## Compiler Setup

```js
// babel.config.js
export default {
  plugins: ['@cssxio/babel-plugin'],
};
```

The adapter package has an entrypoint for each supported build tool. Use `importSource` for a custom runtime module. Use `cssFileName` for the CSS file name. Use `layer` to wrap the generated CSS in a CSS layer. Use either `theme` or `themeFile` for CSSX `@theme` input. The CSS file name must be a relative `.css` path. It can include `[hash]`.

### Development hot reload

In development, CSSX keeps selectors stable, skips production class-name compression and fragment planning, and pushes CSS-only updates without reloading the page or losing UI state. Vite, Next.js, Webpack, Rspack, Rollup, and esbuild are supported; adapters infer development mode where possible, otherwise set it explicitly (for esbuild, `cssxEsbuild({ mode: 'development' })`).

Warm edits to existing static styles target p95 ≤100 ms from save to computed style after the next frame; occasional outliers are acceptable. Startup, new call sites, JavaScript, theme, and composition changes are outside this target. Run `pnpm benchmark:dev-hmr`; production omits the development transport and watchers.

The Rust workspace under `packages/compiler/native` uses Oxc for JavaScript and TypeScript parsing and `lowdash` for bounded source batches. Install Rust 1.99.1 with `rustup toolchain install 1.99.1 --profile minimal --component clippy,rustfmt`, then build the optional local Node addon with `cargo +1.99.1 build --manifest-path packages/compiler/native/Cargo.toml --release -p cssx-compiler-node`. Point `CSSX_NATIVE_COMPILER_PATH` at the resulting addon (`libcssx_compiler_node.dylib`, `.so`, or `.dll`) before starting the CSSX development server or production build. Published `@cssxio/unplugin` installs `@cssxio/compiler-native` optionally on Linux x64, macOS arm64, and Windows x64; unsupported operating systems or architectures use the Babel fallback. The release workflow builds all three packaged addons with Rust 1.99.1, while CI checks the Rust workspace on Linux, macOS, and Windows.

The native analyzer collects metadata for development modules that contain statically foldable `sx()` calls. In production, it can also transform an unexported static `create()` map when every reference is a statically resolvable `props()` call, source maps are disabled, and stable class names are off. Other `create()`/`props()` forms, dynamic `sx()` expressions, and parse errors use the existing Babel transform. Utility resolution and CSS emission continue to use the TypeScript compiler. Without the addon, CSSX uses the Babel transform for every module.

Set `CSSX_DISABLE_NATIVE_COMPILER=1` to measure the Babel fallback. For pre-extracted production utility compilation, run `pnpm benchmark:cssx-utilities -- large --json` and `pnpm benchmark:tailwind-utilities -- large --json`. `pnpm --dir benchmarks benchmark:vite` compares five warmed full React/Vite builds after one warm-up: native CSSX, its Babel fallback, Tailwind, styled-components, and StyleX. It reports medians, ranges, and initial-route output sizes; set `CSSX_NATIVE_COMPILER_PATH` to the built Rust addon to ensure the native row uses Rust. The final bundled build comparison is `pnpm --dir benchmarks benchmark:small`. Compiler-only, full-app build, and save-to-visible timings measure different work.

On the local macOS arm64 benchmark machine, pre-extracted utility compilation medians were 0.53/1.06 ms (CSSX/Tailwind) for small, 1.36/1.81 ms for medium, and 2.73/3.57 ms for large. The large generated CSS was 19.1 KB (4.28 KB gzip) for CSSX and 40.4 KB (5.30 KB gzip) for Tailwind. In the warmed full React/Vite build, native CSSX measured 263 ms, versus 260 ms for Tailwind and 804 ms for the pre-rewrite Babel path. Native CSSX was 3.1 times faster than the pre-rewrite path in this fixture; the full-app build medians for native CSSX and Tailwind were within 1.2% of each other. Its stylesheet was 38,357 B raw (9,748 B gzip), compared with 42,450 B (10,627 B gzip) for pre-rewrite CSSX and 68,783 B (12,910 B gzip) for Tailwind. That is 9.6% smaller raw and 8.3% smaller gzip than pre-rewrite CSSX, and 44.2% smaller raw and 24.5% smaller gzip than Tailwind. The initial-route payload was 98.1 KB gzip, compared with 107.3 KB for Tailwind. The benchmark requires native CSSX CSS to be smaller both raw and gzip than the two baselines and reports the 10% raw reduction as a stretch target; the current measured 9.6% reduction is accepted. CSSX keeps a one-character selector namespace prefix to avoid collisions. These results are local measurements, not guarantees for other machines or application shapes.

Keep the stylesheet link required by your adapter. Do not add generated CSSX stylesheets to source control.

```ts
import cssx from '@cssxio/unplugin';

export default {
  plugins: [cssx({ cssFileName: 'assets/cssx.css' })],
};
```

### Global CSS and dark mode

CSSX emits a Tailwind-compatible browser baseline before utility rules by
default. This preserves Tailwind's box sizing, body margin, inherited
typography, link treatment, and form-control normalization for zero-configuration
migrations while keeping a visible browser focus indicator. CSSX does not load
fonts: `font-*` utilities and any application-selected font remain explicit.

Set `preflight: false` in a build adapter only when an application deliberately
supplies a different global reset.

```ts
cssx({ preflight: false });
```

The `dark:` variant defaults to the operating-system preference:

```css
@media (prefers-color-scheme: dark) {
  /* dark utility rules */
}
```

For an application-controlled theme switcher that sets `data-theme="dark"`,
configure selector mode in the build adapter:

```ts
cssx({ darkMode: 'selector' });
```

Selector mode emits rules that match an element with `data-theme="dark"` or a
descendant of it. Use `media` (or omit `darkMode`) when the operating-system
preference should control dark utilities.

For class-based theme controllers such as `next-themes`, use class mode:

```ts
cssx({ darkMode: 'class' });
```

Class mode emits rules that match an element with the `dark` class or a
descendant of it.

## Custom tokens

Load custom fonts in your app stylesheet when you need them. CSSX does not
load fonts or add global font styles. Define utility tokens in a CSSX theme:

```css
/* cssx.theme.css */
@theme {
  --color-brand: oklch(58% 0.2 255);
  --spacing: 0.3125rem;
  --breakpoint-tablet: 52rem;
}
```

Pass the file as `themeFile`, or pass its text as `theme`. CSSX resolves these
tokens while building. For example, `bg-brand`, `p-4`, and `tablet:grid` use
the values from the theme. CSSX only accepts `@theme` for custom tokens. It
does not accept JavaScript theme settings or custom utility plugins.

`@theme` and `@theme inline` put used token values in utility rules.
`@theme reference` writes only used variables. `@theme static` writes every
token. `@theme prefix(app)` uses names such as `--app-color-brand`. CSSX uses
real breakpoint values in media queries because CSS variables do not work
there. Do not mix theme output modes or prefixes in one theme source.

```css
@theme reference {
  --color-brand: var(--color-brand-base);
  --color-brand-base: #123456;
}

@theme prefix(app) {
  --color-brand: #123456;
}
```

`compileStyleMaps` builds several style maps at once. It creates shared classes
and shared CSS once, then keeps one compiled style map for each input name.

```ts
const result = await compileStyleMaps({
  button: { base: 'animate-spin p-4' },
  card: { base: 'animate-spin bg-white' },
});

const css = serializeCss(result.rules);
```

### Generated class names

Programmatic compiler APIs accept `className` options. The default is compact,
collision-free serial names (`s0x`, `s1x`, …); CSSX allocates every atomic and
composite class in that compilation exactly once.

Static style maps default to `reusabilityBudget: 'auto'`, which extracts
repeated utility groups when that lowers the generated class-string and selector
cost. Use `reusabilityBudget: 0` for one complete class per style or
`reusabilityBudget: 100` for winning atomic classes only.

```ts
const result = await compileStyleMaps(
  { button: { base: 'px-4 bg-blue-600' } },
  { className: { variant: 'serial', prefix: 'app-', suffix: '-v1' } },
);
// app-0-v1, app-1-v1, …, app-z-v1, app-A-v1, …, app-10-v1
```

`prefix` and `suffix` work for both `serial` and the `random` (stable hash)
variant. Serial uses a case-sensitive base-62 sequence (`0`–`9`, `a`–`z`,
`A`–`Z`, then `10`) and defaults to an `s` prefix plus `x` suffix (`s0x`,
`s1x`, …) in the programmatic compiler API. Build adapters omit the default
production suffix to reduce emitted CSS; explicitly configured class names,
stable names, and manifest coordination keep their selected format. To bound hashed names, set its hash fragment length, for example
`{ className: { variant: 'random', prefix: 'app_', length: 5 } }`. CSSX uses
deterministic collision resolution and fails rather than reusing a name if the
chosen length cannot represent every generated class.

Runnable starter projects are in [`examples/`](examples).

## Utility Support

CSSX checks every utility while building. A bracketed value must be static and
safe. An unsupported utility stops the build. The examples below use:

```tsx
import * as cssx from '@cssxio/cssx';
```

The tables below document CSSX's supported utility class families, fixed class
names, value forms, and variants. A suffix such as `<spacing>`, `<color>`, or
`<value>` follows the family-specific rules in its table and may resolve from
the active `@theme` input or a validated arbitrary value.

<!-- cssx-utility-reference:start -->
<details>
<summary>Complete compiler class index: 258 value families and 145 exact classes</summary>

The family prefixes below accept the value forms described in the utility sections above. The semantic group is the compiler write group used for conflict resolution and composition.

#### Value-based utility class prefixes

| Class prefix                     | Semantic group                  |
| -------------------------------- | ------------------------------- |
| `content-visibility-`            | `content-visibility`            |
| `contain-intrinsic-inline-size-` | `contain-intrinsic-inline-size` |
| `contain-intrinsic-block-size-`  | `contain-intrinsic-block-size`  |
| `contain-intrinsic-size-`        | `contain-intrinsic-size`        |
| `contain-`                       | `contain`                       |
| `columns-`                       | `columns`                       |
| `break-before-`                  | `break-before`                  |
| `break-after-`                   | `break-after`                   |
| `break-inside-`                  | `break-inside`                  |
| `float-`                         | `float`                         |
| `clear-`                         | `clear`                         |
| `box-decoration-`                | `box-decoration-break`          |
| `line-clamp-`                    | `line-clamp`                    |
| `list-image-`                    | `list-style-image`              |
| `list-`                          | `list-style-type`               |
| `tab-`                           | `tab-size`                      |
| `whitespace-`                    | `white-space`                   |
| `hyphens-`                       | `hyphens`                       |
| `wrap-`                          | `overflow-wrap`                 |
| `table-`                         | `display`                       |
| `overflow-x-`                    | `overflow-x`                    |
| `overflow-y-`                    | `overflow-y`                    |
| `overscroll-x-`                  | `overscroll-x`                  |
| `overscroll-y-`                  | `overscroll-y`                  |
| `overscroll-`                    | `overscroll`                    |
| `object-`                        | `object`                        |
| `isolation-`                     | `isolation`                     |
| `z-`                             | `z-index`                       |
| `order-`                         | `order`                         |
| `col-span-`                      | `grid-column`                   |
| `col-start-`                     | `grid-column-start`             |
| `col-end-`                       | `grid-column-end`               |
| `row-span-`                      | `grid-row`                      |
| `row-start-`                     | `grid-row-start`                |
| `row-end-`                       | `grid-row-end`                  |
| `grid-cols-`                     | `grid-template-columns`         |
| `grid-rows-`                     | `grid-template-rows`            |
| `grid-flow-`                     | `grid-auto-flow`                |
| `auto-cols-`                     | `grid-auto-columns`             |
| `auto-rows-`                     | `grid-auto-rows`                |
| `place-content-`                 | `place-content`                 |
| `place-items-`                   | `place-items`                   |
| `place-self-`                    | `place-self`                    |
| `justify-items-`                 | `justify-items`                 |
| `justify-self-`                  | `justify-self`                  |
| `justify-`                       | `justify-content`               |
| `items-`                         | `align-items`                   |
| `self-`                          | `align-self`                    |
| `content-`                       | `align-content`                 |
| `basis-`                         | `flex-basis`                    |
| `flex-`                          | `flex`                          |
| `grow`                           | `flex-grow`                     |
| `shrink`                         | `flex-shrink`                   |
| `aspect-`                        | `aspect-ratio`                  |
| `size-`                          | `size`                          |
| `min-inline-`                    | `min-inline-size`               |
| `max-inline-`                    | `max-inline-size`               |
| `inline-`                        | `inline-size`                   |
| `min-block-`                     | `min-block-size`                |
| `max-block-`                     | `max-block-size`                |
| `block-`                         | `block-size`                    |
| `min-w-`                         | `min-width`                     |
| `max-w-`                         | `max-width`                     |
| `min-h-`                         | `min-height`                    |
| `max-h-`                         | `max-height`                    |
| `w-`                             | `width`                         |
| `h-`                             | `height`                        |
| `inset-x-`                       | `inset-x`                       |
| `inset-y-`                       | `inset-y`                       |
| `inset-s-`                       | `start`                         |
| `inset-e-`                       | `end`                           |
| `inset-bs-`                      | `inset-block-start`             |
| `inset-be-`                      | `inset-block-end`               |
| `inset-`                         | `inset`                         |
| `start-`                         | `inset-inline-start`            |
| `end-`                           | `inset-inline-end`              |
| `top-`                           | `top`                           |
| `right-`                         | `right`                         |
| `bottom-`                        | `bottom`                        |
| `left-`                          | `left`                          |
| `space-x-`                       | `space-x`                       |
| `space-y-`                       | `space-y`                       |
| `placeholder-`                   | `placeholder-color`             |
| `underline-offset-`              | `text-underline-offset`         |
| `decoration-`                    | `text-decoration-thickness`     |
| `divide-x-`                      | `divide-x`                      |
| `divide-y-`                      | `divide-y`                      |
| `divide-`                        | `divide-color`                  |
| `outline-offset-`                | `outline-offset`                |
| `outline-`                       | `outline-width`                 |
| `gap-x-`                         | `column-gap`                    |
| `gap-y-`                         | `row-gap`                       |
| `gap-`                           | `gap`                           |
| `scroll-mx-`                     | `scroll-margin-x`               |
| `scroll-my-`                     | `scroll-margin-y`               |
| `scroll-ms-`                     | `scroll-margin-inline-start`    |
| `scroll-me-`                     | `scroll-margin-inline-end`      |
| `scroll-mbs-`                    | `scroll-margin-block-start`     |
| `scroll-mbe-`                    | `scroll-margin-block-end`       |
| `scroll-mt-`                     | `scroll-margin-top`             |
| `scroll-mr-`                     | `scroll-margin-right`           |
| `scroll-mb-`                     | `scroll-margin-bottom`          |
| `scroll-ml-`                     | `scroll-margin-left`            |
| `scroll-m-`                      | `scroll-margin`                 |
| `scroll-px-`                     | `scroll-padding-x`              |
| `scroll-py-`                     | `scroll-padding-y`              |
| `scroll-ps-`                     | `scroll-padding-inline-start`   |
| `scroll-pe-`                     | `scroll-padding-inline-end`     |
| `scroll-pbs-`                    | `scroll-padding-block-start`    |
| `scroll-pbe-`                    | `scroll-padding-block-end`      |
| `scroll-pt-`                     | `scroll-padding-top`            |
| `scroll-pr-`                     | `scroll-padding-right`          |
| `scroll-pb-`                     | `scroll-padding-bottom`         |
| `scroll-pl-`                     | `scroll-padding-left`           |
| `scroll-p-`                      | `scroll-padding`                |
| `mx-`                            | `mx`                            |
| `my-`                            | `my`                            |
| `ms-`                            | `ms`                            |
| `me-`                            | `me`                            |
| `mbs-`                           | `margin-block-start`            |
| `mbe-`                           | `margin-block-end`              |
| `mt-`                            | `mt`                            |
| `mr-`                            | `mr`                            |
| `mb-`                            | `mb`                            |
| `ml-`                            | `ml`                            |
| `m-`                             | `m`                             |
| `px-`                            | `px`                            |
| `py-`                            | `py`                            |
| `ps-`                            | `ps`                            |
| `pe-`                            | `pe`                            |
| `pbs-`                           | `padding-block-start`           |
| `pbe-`                           | `padding-block-end`             |
| `pt-`                            | `pt`                            |
| `pr-`                            | `pr`                            |
| `pb-`                            | `pb`                            |
| `pl-`                            | `pl`                            |
| `p-`                             | `p`                             |
| `font-synthesis-`                | `font-synthesis`                |
| `font-optical-`                  | `font-optical-sizing`           |
| `font-kerning-`                  | `font-kerning`                  |
| `font-`                          | `font-family`                   |
| `text-combine-upright-`          | `text-combine-upright`          |
| `text-orientation-`              | `text-orientation`              |
| `text-`                          | `text`                          |
| `leading-`                       | `line-height`                   |
| `tracking-`                      | `letter-spacing`                |
| `indent-`                        | `text-indent`                   |
| `align-`                         | `vertical-align`                |
| `whitespace-`                    | `white-space`                   |
| `break-`                         | `word-break`                    |
| `hyphens-`                       | `hyphens`                       |
| `bg-linear-to-`                  | `background-image`              |
| `bg-linear-`                     | `background-image`              |
| `bg-`                            | `background`                    |
| `accent-`                        | `accent-color`                  |
| `caret-`                         | `caret-color`                   |
| `stroke-miterlimit-`             | `stroke-miterlimit`             |
| `stroke-dasharray-`              | `stroke-dasharray`              |
| `stroke-dashoffset-`             | `stroke-dashoffset`             |
| `stroke-cap-`                    | `stroke-linecap`                |
| `stroke-join-`                   | `stroke-linejoin`               |
| `fill-rule-`                     | `fill-rule`                     |
| `clip-rule-`                     | `clip-rule`                     |
| `vector-effect-`                 | `vector-effect`                 |
| `paint-order-`                   | `paint-order`                   |
| `shape-rendering-`               | `shape-rendering`               |
| `fill-`                          | `fill`                          |
| `stroke-`                        | `stroke`                        |
| `scrollbar-thumb-`               | `scrollbar-thumb`               |
| `scrollbar-track-`               | `scrollbar-track`               |
| `scheme-`                        | `color-scheme`                  |
| `mask-`                          | `mask-image`                    |
| `from-`                          | `gradient-from`                 |
| `via-`                           | `gradient-via`                  |
| `to-`                            | `gradient-to`                   |
| `rounded-`                       | `border-radius`                 |
| `border-spacing-`                | `border-spacing`                |
| `border-x-`                      | `border-x`                      |
| `border-y-`                      | `border-y`                      |
| `border-s-`                      | `border-inline-start`           |
| `border-e-`                      | `border-inline-end`             |
| `border-bs-`                     | `border-block-start`            |
| `border-be-`                     | `border-block-end`              |
| `border-t-`                      | `border-top`                    |
| `border-r-`                      | `border-right`                  |
| `border-b-`                      | `border-bottom`                 |
| `border-l-`                      | `border-left`                   |
| `border-`                        | `border`                        |
| `outline-`                       | `outline`                       |
| `ring-offset-`                   | `ring-offset`                   |
| `ring-`                          | `ring`                          |
| `shadow-`                        | `box-shadow`                    |
| `opacity-`                       | `opacity`                       |
| `mix-blend-`                     | `mix-blend-mode`                |
| `bg-blend-`                      | `background-blend-mode`         |
| `filter-`                        | `filter`                        |
| `blur-`                          | `blur`                          |
| `brightness-`                    | `brightness`                    |
| `contrast-`                      | `contrast`                      |
| `drop-shadow-`                   | `drop-shadow`                   |
| `grayscale-`                     | `grayscale`                     |
| `hue-rotate-`                    | `hue-rotate`                    |
| `invert-`                        | `invert`                        |
| `saturate-`                      | `saturate`                      |
| `sepia-`                         | `sepia`                         |
| `backdrop-`                      | `backdrop-filter`               |
| `animation-name-`                | `animation-name`                |
| `animation-composition-`         | `animation-composition`         |
| `animation-timeline-`            | `animation-timeline`            |
| `animation-range-start-`         | `animation-range-start`         |
| `animation-range-end-`           | `animation-range-end`           |
| `animation-range-`               | `animation-range`               |
| `animation-duration-`            | `animation-duration`            |
| `animation-delay-`               | `animation-delay`               |
| `animation-ease-`                | `animation-timing-function`     |
| `animation-iterations-`          | `animation-iteration-count`     |
| `animation-direction-`           | `animation-direction`           |
| `animation-fill-`                | `animation-fill-mode`           |
| `animation-`                     | `animation-play-state`          |
| `writing-`                       | `writing-mode`                  |
| `unicode-bidi-`                  | `unicode-bidi`                  |
| `image-render-`                  | `image-rendering`               |
| `transition-`                    | `transition-property`           |
| `duration-`                      | `transition-duration`           |
| `delay-`                         | `transition-delay`              |
| `ease-`                          | `transition-timing-function`    |
| `animate-`                       | `animation`                     |
| `stagger-index-`                 | `stagger-index`                 |
| `stagger-count-`                 | `stagger-count`                 |
| `stagger-reverse`                | `stagger-reverse`               |
| `stagger-`                       | `stagger`                       |
| `scroll-timeline-name-`          | `scroll-timeline-name`          |
| `scroll-timeline-axis-`          | `scroll-timeline-axis`          |
| `view-timeline-name-`            | `view-timeline-name`            |
| `view-timeline-axis-`            | `view-timeline-axis`            |
| `view-timeline-inset-`           | `view-timeline-inset`           |
| `timeline-scope-`                | `timeline-scope`                |
| `view-transition-name-`          | `view-transition-name`          |
| `view-transition-class-`         | `view-transition-class`         |
| `origin-`                        | `transform-origin`              |
| `scale-x-`                       | `scale-x`                       |
| `scale-y-`                       | `scale-y`                       |
| `scale-z-`                       | `scale-z`                       |
| `scale-`                         | `scale`                         |
| `rotate-x-`                      | `rotate-x`                      |
| `rotate-y-`                      | `rotate-y`                      |
| `rotate-z-`                      | `rotate-z`                      |
| `rotate-`                        | `rotate`                        |
| `translate-x-`                   | `translate-x`                   |
| `translate-y-`                   | `translate-y`                   |
| `translate-z-`                   | `translate-z`                   |
| `translate-`                     | `translate`                     |
| `skew-x-`                        | `skew-x`                        |
| `skew-y-`                        | `skew-y`                        |
| `skew-`                          | `skew`                          |
| `cursor-`                        | `cursor`                        |
| `touch-`                         | `touch-action`                  |
| `will-change-`                   | `will-change`                   |

#### Exact utility classes

| Class                      | Semantic group               |
| -------------------------- | ---------------------------- |
| `absolute`                 | `position`                   |
| `accent-auto`              | `accent-color`               |
| `antialiased`              | `font-smoothing`             |
| `appearance-auto`          | `appearance`                 |
| `appearance-none`          | `appearance`                 |
| `block`                    | `display`                    |
| `blur`                     | `blur`                       |
| `border`                   | `border-width`               |
| `border-collapse`          | `border-collapse`            |
| `border-dashed`            | `border-style`               |
| `border-dotted`            | `border-style`               |
| `border-double`            | `border-style`               |
| `border-hidden`            | `border-style`               |
| `border-none`              | `border-style`               |
| `border-separate`          | `border-collapse`            |
| `border-solid`             | `border-style`               |
| `box-border`               | `box-sizing`                 |
| `box-content`              | `box-sizing`                 |
| `capitalize`               | `text-transform`             |
| `caption-bottom`           | `caption-side`               |
| `caption-top`              | `caption-side`               |
| `caret-auto`               | `caret-color`                |
| `collapse`                 | `visibility`                 |
| `container`                | `container`                  |
| `contents`                 | `display`                    |
| `diagonal-fractions`       | `numeric-diagonal-fractions` |
| `divide-x`                 | `divide-x`                   |
| `divide-y`                 | `divide-y`                   |
| `drop-shadow`              | `drop-shadow`                |
| `field-sizing-content`     | `field-sizing`               |
| `fill-none`                | `fill`                       |
| `fixed`                    | `position`                   |
| `flex`                     | `display`                    |
| `flex-col`                 | `flex-direction`             |
| `flex-col-reverse`         | `flex-direction`             |
| `flex-nowrap`              | `flex-wrap`                  |
| `flex-row`                 | `flex-direction`             |
| `flex-row-reverse`         | `flex-direction`             |
| `flex-wrap`                | `flex-wrap`                  |
| `flex-wrap-reverse`        | `flex-wrap`                  |
| `flow-root`                | `display`                    |
| `font-black`               | `font-weight`                |
| `font-bold`                | `font-weight`                |
| `font-extrabold`           | `font-weight`                |
| `font-extralight`          | `font-weight`                |
| `font-light`               | `font-weight`                |
| `font-medium`              | `font-weight`                |
| `font-normal`              | `font-weight`                |
| `font-semibold`            | `font-weight`                |
| `font-thin`                | `font-weight`                |
| `forced-color-adjust-auto` | `forced-color-adjust`        |
| `forced-color-adjust-none` | `forced-color-adjust`        |
| `grayscale`                | `grayscale`                  |
| `grid`                     | `display`                    |
| `hidden`                   | `display`                    |
| `inline`                   | `display`                    |
| `inline-block`             | `display`                    |
| `inline-flex`              | `display`                    |
| `inline-grid`              | `display`                    |
| `inline-table`             | `display`                    |
| `invert`                   | `invert`                     |
| `invisible`                | `visibility`                 |
| `isolate`                  | `isolation`                  |
| `isolation-auto`           | `isolation`                  |
| `italic`                   | `font-style`                 |
| `line-through`             | `text-decoration-line`       |
| `lining-nums`              | `numeric-lining-nums`        |
| `list-item`                | `display`                    |
| `lowercase`                | `text-transform`             |
| `no-underline`             | `text-decoration-line`       |
| `normal-case`              | `text-transform`             |
| `normal-nums`              | `numeric-normal`             |
| `not-italic`               | `font-style`                 |
| `not-sr-only`              | `sr-only`                    |
| `oldstyle-nums`            | `numeric-oldstyle-nums`      |
| `ordinal`                  | `numeric-ordinal`            |
| `outline`                  | `outline-width`              |
| `outline-dashed`           | `outline-style`              |
| `outline-dotted`           | `outline-style`              |
| `outline-double`           | `outline-style`              |
| `outline-hidden`           | `outline-hidden`             |
| `outline-none`             | `outline-style`              |
| `outline-solid`            | `outline-style`              |
| `overflow-auto`            | `overflow`                   |
| `overflow-clip`            | `overflow`                   |
| `overflow-hidden`          | `overflow`                   |
| `overflow-scroll`          | `overflow`                   |
| `overflow-visible`         | `overflow`                   |
| `overline`                 | `text-decoration-line`       |
| `pointer-events-auto`      | `pointer-events`             |
| `pointer-events-none`      | `pointer-events`             |
| `proportional-nums`        | `numeric-proportional-nums`  |
| `relative`                 | `position`                   |
| `resize`                   | `resize`                     |
| `resize-none`              | `resize`                     |
| `resize-x`                 | `resize`                     |
| `resize-y`                 | `resize`                     |
| `rounded`                  | `border-radius`              |
| `scroll-auto`              | `scroll-behavior`            |
| `scroll-smooth`            | `scroll-behavior`            |
| `scrollbar-auto`           | `scrollbar-width`            |
| `scrollbar-gutter-auto`    | `scrollbar-gutter`           |
| `scrollbar-gutter-both`    | `scrollbar-gutter`           |
| `scrollbar-gutter-stable`  | `scrollbar-gutter`           |
| `scrollbar-none`           | `scrollbar-width`            |
| `scrollbar-thin`           | `scrollbar-width`            |
| `select-all`               | `user-select`                |
| `select-auto`              | `user-select`                |
| `select-none`              | `user-select`                |
| `select-text`              | `user-select`                |
| `sepia`                    | `sepia`                      |
| `shadow`                   | `box-shadow`                 |
| `slashed-zero`             | `numeric-slashed-zero`       |
| `snap-align-none`          | `scroll-snap-align`          |
| `snap-always`              | `scroll-snap-stop`           |
| `snap-both`                | `scroll-snap-type`           |
| `snap-center`              | `scroll-snap-align`          |
| `snap-end`                 | `scroll-snap-align`          |
| `snap-mandatory`           | `scroll-snap-strictness`     |
| `snap-none`                | `scroll-snap-type`           |
| `snap-normal`              | `scroll-snap-stop`           |
| `snap-proximity`           | `scroll-snap-strictness`     |
| `snap-start`               | `scroll-snap-align`          |
| `snap-x`                   | `scroll-snap-type`           |
| `snap-y`                   | `scroll-snap-type`           |
| `sr-only`                  | `sr-only`                    |
| `stacked-fractions`        | `numeric-stacked-fractions`  |
| `static`                   | `position`                   |
| `sticky`                   | `position`                   |
| `stroke-none`              | `stroke`                     |
| `subpixel-antialiased`     | `font-smoothing`             |
| `table`                    | `display`                    |
| `table-auto`               | `table-layout`               |
| `table-fixed`              | `table-layout`               |
| `tabular-nums`             | `numeric-tabular-nums`       |
| `transform`                | `transform`                  |
| `transform-none`           | `transform`                  |
| `transition`               | `transition-property`        |
| `transition-discrete`      | `transition-behavior`        |
| `transition-none`          | `transition-property`        |
| `transition-normal`        | `transition-behavior`        |
| `truncate`                 | `truncate`                   |
| `underline`                | `text-decoration-line`       |
| `uppercase`                | `text-transform`             |
| `visible`                  | `visibility`                 |

</details>
<!-- cssx-utility-reference:end -->

#### Example

```tsx
const styles = cssx.create({
  button: 'transition-transform-opacity duration-normal ease-spring-snappy hover:scale-105',
  dialog: 'open:starting:opacity-0 open:starting:translate-y-2 motion-reduce:duration-instant',
});

<button {...cssx.props(styles.button)}>Save</button>;
```

### Interaction and form controls

| Class                                                                                                                                                                                                                                                                                                                              | Styles                                    |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `cursor-{auto,default,pointer,wait,text,move,help,not-allowed,none,context-menu,progress,cell,crosshair,vertical-text,alias,copy,no-drop,grab,grabbing,all-scroll,col-resize,row-resize,n-resize,e-resize,s-resize,w-resize,ne-resize,nw-resize,se-resize,sw-resize,ew-resize,ns-resize,nesw-resize,nwse-resize,zoom-in,zoom-out}` | `cursor`.                                 |
| `touch-{auto,none,manipulation,pan-x,pan-y,pinch-zoom}`                                                                                                                                                                                                                                                                            | `touch-action`.                           |
| `will-change-{auto,scroll,contents,transform}`                                                                                                                                                                                                                                                                                     | `will-change`.                            |
| `pointer-events-{none,auto}`, `select-{none,text,all,auto}`                                                                                                                                                                                                                                                                        | Pointer event or text-selection behavior. |
| `accent-auto`, `accent-<color>`, `caret-auto`, `caret-<color>`                                                                                                                                                                                                                                                                     | Accent or caret color.                    |
| `appearance-{auto,none}`                                                                                                                                                                                                                                                                                                           | `appearance`.                             |
| `scheme-{normal,dark,light,light-dark,only-dark,only-light}`                                                                                                                                                                                                                                                                       | `color-scheme`.                           |
| `field-sizing-content`                                                                                                                                                                                                                                                                                                             | `field-sizing: content`.                  |
| `resize`, `resize-{x,y,none}`                                                                                                                                                                                                                                                                                                      | Resize behavior.                          |

#### Example

```tsx
const styles = cssx.create({
  textarea: 'cursor-text touch-manipulation select-none accent-blue-500 appearance-none resize-y',
});

<textarea {...cssx.props(styles.textarea)} />;
```

### Scrolling and scrollbars

| Class                                                | Styles                              |
| ---------------------------------------------------- | ----------------------------------- |
| `scroll-{m,mx,my,mt,mr,mb,ml}-<spacing>`             | Physical scroll margin.             |
| `scroll-{p,px,py,pt,pr,pb,pl}-<spacing>`             | Physical scroll padding.            |
| `scroll-{auto,smooth}`                               | `scroll-behavior`.                  |
| `scrollbar-{auto,thin,none}`                         | `scrollbar-width`.                  |
| `scrollbar-{thumb,track}-<color>`                    | Composed `scrollbar-color` channel. |
| `scrollbar-gutter-{auto,stable,both}`                | `scrollbar-gutter`.                 |
| `snap-{none,x,y,both}`, `snap-{mandatory,proximity}` | Scroll-snap type and strictness.    |
| `snap-{normal,always}`                               | `scroll-snap-stop`.                 |
| `snap-{start,end,center,align-none}`                 | `scroll-snap-align`.                |

#### Example

```tsx
const styles = cssx.create({
  gallery: 'overflow-x-auto scroll-smooth snap-x snap-mandatory snap-always scrollbar-thin scrollbar-thumb-slate-500',
});

<div {...cssx.props(styles.gallery)} />;
```

### SVG and forced colors

| Class                                                                                                                                                          | Styles                          |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `fill-none`, `fill-<color>`                                                                                                                                    | SVG `fill`.                     |
| `stroke-none`, `stroke-<color>`                                                                                                                                | SVG `stroke` color.             |
| `stroke-<n>`, `stroke-[value]`                                                                                                                                 | SVG `stroke-width`.             |
| `stroke-cap-{butt,round,square}`, `stroke-join-{miter,round,bevel}`, `stroke-miterlimit-{n,[value],(--property)}`                                              | SVG stroke geometry.            |
| `stroke-dasharray-{n,[value],(--property)}`, `stroke-dashoffset-{n,[value],(--property)}`                                                                      | SVG dash pattern or offset.     |
| `fill-rule-{nonzero,evenodd}`, `clip-rule-{nonzero,evenodd}`                                                                                                   | SVG fill and clip rules.        |
| `vector-effect-{none,non-scaling-stroke}`, `paint-order-{normal,fill,stroke,markers}`, `shape-rendering-{auto,optimize-speed,crisp-edges,geometric-precision}` | SVG presentation and rendering. |
| `forced-color-adjust-{auto,none}`                                                                                                                              | `forced-color-adjust`.          |

#### Example

```tsx
const styles = cssx.create({
  icon: 'fill-blue-500 stroke-white stroke-[1.5px] forced-color-adjust-auto',
});

<svg {...cssx.props(styles.icon)} aria-hidden="true" />;
```

### Arbitrary declarations

| Class              | Styles                                                           |
| ------------------ | ---------------------------------------------------------------- |
| `[property:value]` | One validated declaration. Custom properties are supported.      |
| `text-[length]`    | `font-size` when the value is recognized as a length.            |
| `text-[color]`     | Text color when the value resolves as a color.                   |
| `bg-[image]`       | `background-image` when the value is a supported image function. |
| `bg-[color]`       | Background color when the value resolves as a color.             |

Semicolons, braces, malformed nesting, and unsafe property names are rejected.

### Containment and rendering

| Class                                                                                  | Styles                                                  |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `content-visibility-{visible,auto,hidden}`                                             | `content-visibility`.                                   |
| `contain-{none,content,strict,size,inline-size,layout,style,paint}`, `contain-[value]` | CSS containment. For example, `contain-[layout paint]`. |
| `contain-intrinsic-{size,inline-size,block-size}-{n,[value],(--property)}`             | Intrinsic fallback size for contained content.          |
| `image-render-{auto,crisp-edges,pixelated}`                                            | Image interpolation behavior.                           |

#### Example

```tsx
const styles = cssx.create({
  logo: '[mask-type:luminance] text-[14px] bg-[url("/hero.svg")]',
});

<div {...cssx.props(styles.logo)} />;
```

### Variants

Variants stack before a candidate, for example `tablet:hover:bg-brand`. CSSX
supports custom breakpoints from `--breakpoint-*`; defaults are `sm`, `md`,
`lg`, `xl`, and `2xl`.

| Variant                                                                                                                                                                                                                                                                                            | Selector or condition                                                         |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `hover:`                                                                                                                                                                                                                                                                                           | `:hover` within `@media (hover: hover)`.                                      |
| `focus:`, `focus-visible:`, `focus-within:`, `active:`, `disabled:`, `enabled:`, `visited:`, `checked:`, `indeterminate:`, `default:`, `valid:`, `invalid:`, `in-range:`, `out-of-range:`, `placeholder-shown:`, `autofill:`, `read-only:`, `required:`, `optional:`, `open:`, `target:`, `empty:` | Corresponding state pseudo-class.                                             |
| `first:`, `last:`, `only:`, `odd:`, `even:`, `first-of-type:`, `last-of-type:`, `only-of-type:`                                                                                                                                                                                                    | Structural pseudo-class.                                                      |
| `before:`, `after:`, `selection:`, `marker:`, `file:`, `first-letter:`, `first-line:`, `placeholder:`                                                                                                                                                                                              | Pseudo-element. `before` and `after` receive default empty content.           |
| `group-<state>:`, `peer-<state>:`                                                                                                                                                                                                                                                                  | Stateful group or sibling relationship.                                       |
| `state-[name]:`, `group-state-[name]:`, `peer-state-[name]:`                                                                                                                                                                                                                                       | Custom-element `:state(name)` condition, directly or through a group or peer. |
| `has-<state>:`, `has-[selector]:`, `in-<state>:`, `not-<state>:`                                                                                                                                                                                                                                   | Relationship condition.                                                       |
| `*:`, `**:`                                                                                                                                                                                                                                                                                        | Direct-child or descendant scope.                                             |
| `data-name:`, `data-[name=value]:`, `aria-name:`, `aria-[name=value]:`                                                                                                                                                                                                                             | Attribute condition.                                                          |
| `dark:`, `print:`, `supports-[property:value]:`, `not-supports-[property:value]:`                                                                                                                                                                                                                  | Media or support condition.                                                   |
| `<breakpoint>:`, `max-<breakpoint>:`, `min-[value]:`, `max-[value]:`                                                                                                                                                                                                                               | Responsive condition.                                                         |
| `[&p]:`, `[&>svg]:`, `[&.is-active]:`, `[@supports(...)]:`, `[@media ...]:`                                                                                                                                                                                                                        | Safe arbitrary selector or at-rule condition.                                 |

Arbitrary selector variants must contain `&`; only static selectors and
supported at-rules are accepted. A compact descendant type selector such as `[&p]`
is equivalent to `[& p]` and legacy `[&_p]`. Descendant selectors beginning
with punctuation need a literal space after `&`: `[& .child]`,
`[& [data-state=open]]`, `[& :where(p,li)]`, and `[& *]`. Without that space,
classes, attributes, and pseudo-classes attach to the current element, as in
`[&.is-active]`, `[&[data-state=open]]`, and `[&:where(p,li)]`. For example,
`[&_:where(p,li)]` cannot be shortened to `[&:where(p,li)]` without changing
which elements the selector matches. The underscore form remains supported as
a space alias, but a literal space makes descendant scope clear.

Custom state names must be identifiers, for example `state-[open]:block` or
`group-state-[expanded]:text-white`.

#### Example

```tsx
const styles = cssx.create({
  trigger: 'sm:hover:bg-blue-600 group-focus:text-white data-[state=open]:block [&>svg]:size-4',
});

<button {...cssx.props(styles.trigger)} data-state="open">
  <svg />
</button>;
```

### Composition

CSSX stores the style groups that each compiled style changes. The browser can
then merge compiled styles without reading utility syntax.

| Composition                                                 | Result                                             |
| ----------------------------------------------------------- | -------------------------------------------------- |
| Broad directional utility followed by a narrower one        | Only the overlapping declaration atom is replaced. |
| Same semantic write group                                   | The later compiled style wins.                     |
| Logical and physical writes                                 | Remain independently composable.                   |
| Filters, backdrop filters, transforms, gradients, and rings | Their channels compose independently.              |
| `normal-nums`, `filter-none`, `backdrop-filter-none`        | Reset all related channels.                        |
| `space-*` and `divide-*`                                    | Remain a child-selector-scoped atom.               |

#### Example

```tsx
const styles = cssx.create({
  base: 'px-4 scale-95',
  override: 'pr-2 scale-x-105',
});

<div {...cssx.props(styles.base, styles.override)} />;
```

`create` input is intentionally static. Dynamic utility strings should remain
raw class strings or be modeled as explicit static style choices.

## Verification

- `pnpm test:unit` runs the unit tests.
- `pnpm test:coverage` runs the tests with coverage checks.
- `pnpm generate:tailwind-corpus` verifies the pinned Tailwind 4.3.3 checkout at `experiments/tailwindcss`, then regenerates the immutable candidate list, default theme tokens, and checked-in semantic fallback data. Tailwind is a development-only conformance oracle and is never a CSSX production dependency.
- `pnpm test:package-contract` builds packages and checks their public files, dependencies, file sizes, and import time.
- `pnpm lint` checks source files and tests with ESLint.
- `pnpm typecheck` checks workspace types.
- `pnpm test:release` runs formatting, linting, coverage, package checks, and type checks.
- `pnpm generate:utility-reference` updates the README's full compiler-backed value-prefix and exact-class index. `pnpm test:release` checks that this index matches the utility registry.

## Package releases

Dispatch **Prepare package versions** to select a semver bump. It detects public
packages changed since their latest release tags, adds patch bumps for
dependents whose internal dependency ranges must advance, checks that each
planned version is valid, unpublished, and untagged, then updates the manifests
and lockfile. Leave **pr_id** empty to open a separate version-preparation PR.
To avoid a second CI cycle, provide the number of an open same-repository PR
targeting `main`; the workflow commits the version updates directly to that PR
branch, where its normal CI checks the source and version changes together.
Dispatch this before waiting for the source PR's first CI run to finish so the
updated branch gets one final check run. The workflow does not merge a PR or
bypass branch protection. Merging a PR to `main` does not trigger another CI run.

Then dispatch **Release packages** with **package** set to `auto`. It publishes
the changed packages at their prepared versions after building native artifacts
and running `pnpm test:release` and `pnpm benchmark` on the selected main
commit. It then creates tags and GitHub Releases. This workflow does not change
package versions or open a PR. If a partial publish fails, rerun it with **auto**
to complete packages that are still untagged. Leave **release_sha**
empty when retrying from the original main commit. If `main` has moved, set
**release_sha** to the commit SHA shown in the failed release run's summary so
all remaining packages are built and tagged from the same commit as the ones
already published. The workflow verifies that this commit is still in `main`
and repeats its native build and release checks from that commit. For a package
whose tag already exists but whose GitHub Release was not completed, select that
package explicitly and pass the same
**release_sha** if needed. The workflow skips already-published artifacts and
refuses a tag that points at a different commit. GitHub repository auto-merge
remains disabled for ordinary pull requests.

Configure npm trusted publishing separately for each npm package, with
repository `liberocks/cssx` and workflow file `release-packages.yml`. Do not select
an npm environment: this workflow does not use a GitHub Actions environment.
It has the required OIDC `id-token: write` permission and therefore publishes
without an npm token.

For `cssx-intellisense`, configure a trusted publishing policy for repository
`liberocks/cssx` and workflow file `release-packages.yml` in the Visual Studio
Marketplace publisher settings. The release job uses `@vscode/vsce publish
--oidc` and needs no Marketplace token secret. The policy must be in place
before the first automated publication.

For an IntelliSense-only release, **Prepare package versions** still detects the
changed extension automatically; the release step can use the default `auto`
selection. Version `0.1.1` is currently published.

Each GitHub Release lists the commits merged since that package's previous tag.
For a package's first automated release, it uses the `release-baseline` tag
when available.

Create a repository GitHub App with **Contents: read and write** and **Pull
requests: read and write** permissions, install it on this repository, and add
its ID and PEM private key as the `RELEASE_APP_ID` and
`RELEASE_APP_PRIVATE_KEY` Actions secrets. The version-preparation workflow uses
its short-lived installation token to push the version branch and open a PR;
the release workflow uses it for tags and GitHub Releases.

CSSX conforms to every built-in static candidate in the pinned Tailwind 4.3.3
IntelliSense snapshot, including candidates whose correct default-theme result
is no CSS. It also supports CSSX `@theme` customization and safe arbitrary
utility/property/selector syntax. Tailwind plugins, legacy JavaScript config
compatibility, and Tailwind `@utility`/`@variant` extension directives remain
outside this compatibility contract. The corpus test exercises the full
immutable snapshot so compatibility regressions cannot be silent. CSSX-only
utility families are covered by compiler conformance and capability tests.
Statement, branch, function, and line coverage thresholds remain 100%;
production code is not excluded to meet them.

Historical compatibility references are documented in [`packages/compiler/THIRD_PARTY_NOTICES.md`](packages/compiler/THIRD_PARTY_NOTICES.md).
