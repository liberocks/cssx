# @cssxio/unplugin

CSSX has build tool adapters at these entrypoints:

```ts
import cssxEsbuild from '@cssxio/unplugin/esbuild';
import cssxRollup from '@cssxio/unplugin/rollup';
import cssxRspack from '@cssxio/unplugin/rspack';
import cssxVite from '@cssxio/unplugin/vite';
import cssxWebpack from '@cssxio/unplugin/webpack';
```

For Next.js, use the supported integration. It prepares one complete stylesheet, coordinates compiler workers, handles App Router inclusion and development updates, and sends CSS through Next's normal stylesheet pipeline.

The integration requires `app/layout.js`, `app/layout.jsx`, `app/layout.ts`, `app/layout.tsx`, or the equivalent under `src/app`. It reports a configuration error for projects without an App Router root layout.

```js
// next.config.mjs
import { withCSSX } from '@cssxio/unplugin/next';

export default withCSSX(
  {},
  {
    theme: '@theme reference { --color-brand: #171717; }',
    debug: true,
  },
);
```

CSSX defaults to serial `s…x` names and a persisted `.cssx/classnames.json` manifest in `withCSSX`. Add `.cssx/` to `.gitignore`. Next.js 16 projects can select either bundler with `next dev --webpack` / `next build --webpack`, or `next dev --turbopack` / `next build --turbopack`. MDX source files are compiled by the helper; install `@mdx-js/mdx` when a project contains `.md` or `.mdx` files. Configure serializable remark, rehype, or recma plugins with `mdx`. Use `sourceRoots` for linked workspace packages outside the project root.

`withCSSX` composes with a synchronous `webpack(config)` callback. It throws a clear error if an existing callback returns a Promise, since Next.js invokes that hook synchronously.

### Naming and compiler coordination

The legacy `stableClassNames: true` option selects source-addressed composite names (`d…`) and overrides the expected serial composite output. This behavior is unchanged for compatibility. New configurations can choose `naming: 'serial' | 'hash' | 'source'` separately from `coordination: 'memory' | 'manifest'`. `className` controls serial or hash atomic names and prefixes; `naming: 'source'` selects source-addressed composites while atomic names continue to use `className`.

Manifest coordination stores identity assignments and the serial counter under a lock, then replaces the JSON file atomically. Keep the manifest between builds to retain serial assignments. A fresh manifest can assign different serial values. A custom `classNameAllocator` is in-process only and cannot be combined with manifest coordination or `withCSSX`.

For Webpack and Rspack, `className` configures CSSX's built-in allocator, which sibling compiler instances share when they have the same project root and plugin options. A custom `classNameAllocator` replaces that built-in allocator and must be supplied without `className`; it controls allocation only within the current process. Use manifest coordination when compiler processes must share serial assignments.

`debug: true` prints the effective naming mode, selector coverage, and compiler mapping status. `debug: { reportFile: 'path/to/report.json' }` writes a JSON report with utilities, source locations, generated classes, selector checks, manifest coordination status, and conflicting utility mappings. `serverClientMappings.status` is `manifest-shared` when a manifest is configured and collected modules agree, `mismatch` when one utility maps to different classes, or `consistent-in-process` when collected modules agree under an in-process allocator.

Add the selected generic adapter to your build tool `plugins` setting:

```ts
// vite.config.ts
import cssx from '@cssxio/unplugin/vite';

export default { plugins: [cssx()] };
```

### Vue 3 with Vite

Place CSSX before Vue in the Vite plugin list. CSSX transforms `create` and
`sx` calls in `<script>`, `<script setup>`, and `:class="sx(...)"` template
bindings. Static plain `class="..."` attributes are intentionally left alone.

```ts
import cssx from '@cssxio/unplugin/vite';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig({ plugins: [cssx(), vue()] });
```

```js
// rollup.config.js
import cssx from '@cssxio/unplugin/rollup';

export default { plugins: [cssx({ cssFileName: 'assets/cssx.css' })] };
```

```js
// webpack.config.js
import cssx from '@cssxio/unplugin/webpack';

export default { plugins: [cssx()] };
```

```js
// rspack.config.js
import cssx from '@cssxio/unplugin/rspack';

export default { plugins: [cssx()] };
```

```js
// build.mjs
import cssx from '@cssxio/unplugin/esbuild';
import { build } from 'esbuild';

await build({ entryPoints: ['src/main.ts'], bundle: true, plugins: [cssx()] });
```

## Programmatic API

The main entrypoint exports the low-level `unpluginFactory`, the universal `unplugin` adapter instance, and named callable factories for Vite, Rollup, webpack, Rspack, and esbuild. Most applications should import one platform entrypoint shown above.

```ts
import { transformCssxModule, compileCssxStylesheet } from '@cssxio/unplugin';

const transformed = await transformCssxModule(source, 'src/button.tsx');
const stylesheet = await compileCssxStylesheet([
  {
    id: 'src/button.tsx',
    candidates: transformed?.candidates ?? {},
    origins: transformed?.origins,
    composites: transformed?.composites,
    atomicClasses: transformed?.atomicClasses,
  },
]);
```

`transformCssxModule` returns `null` unless the source module imports the configured CSSX runtime. Otherwise it returns transformed JavaScript, candidate metadata, composite-to-atomic selector metadata, source locations, and a JavaScript source map when the transform creates one. Pass an earlier compatible version 3 source map as its fourth argument to continue that map.

`compileCssxStylesheet` combines module metadata in stable module and utility order, removes duplicate utilities, aliases each winning atomic rule to the composite classes that use it, and returns generated CSS. It also returns a CSS source map when collected metadata includes source locations. `CssxPluginOptions`, `TransformResult`, `IncomingSourceMap`, `CssxSourceModule`, and stylesheet source-map types are exported from the main entrypoint.

## Options

| Option               | Default        | What it does                                                                                                                                                                                              |
| -------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `importSource`       | `@cssxio/cssx` | Module specifier that identifies source files to transform. A source file must contain this text and have a JavaScript or TypeScript extension.                                                           |
| `cssFileName`        | `cssx.css`     | Relative CSS output path. It must be non-empty, end in `.css`, and stay within the bundler output directory. `[hash]` is replaced with a stable hash of the generated CSS.                                |
| `naming`             | `serial`       | Selects generated composite naming: `serial`, `hash`, or source-addressed `source`. Independent of compiler coordination.                                                                                 |
| `coordination`       | `memory`       | Coordinates assignments within one adapter instance (`memory`) or through a persisted manifest (`manifest`).                                                                                              |
| `manifestPath`       | —              | JSON file used when `coordination: 'manifest'`. Independent compiler workers must share this path.                                                                                                        |
| `className`          | serial `s…x`   | Controls atomic naming format, prefix, suffix, and hash length. Respected by compiler allocators used in every adapter.                                                                                   |
| `classNameAllocator` | —              | Custom allocator for in-process integrations. Omit `className` when supplying one; manifest coordination uses CSSX's persisted allocator instead.                                                         |
| `stableClassNames`   | `false`        | Deprecated compatibility alias for `naming: 'source'`; emits source-addressed `d…` composites and overrides serial composite output.                                                                      |
| `debug`              | `false`        | Prints a concise output summary or writes a class/source/selector diagnostic JSON report.                                                                                                                 |
| `sourceRoots`        | project root   | Additional source directories included by the Next.js preparation pass.                                                                                                                                   |
| `sourceMap`          | `true`         | Whether to generate a separate CSS source map. Set it to `false` to omit both the `.css.map` file and source-map comment.                                                                                 |
| `layer`              | —              | CSS layer name that wraps generated CSS. It must be a single valid layer identifier, such as `cssx`.                                                                                                      |
| `theme`              | —              | Inline CSSX `@theme` source used while transforming and compiling CSS. The theme is compiled into generated rules; it does not add a global stylesheet.                                                   |
| `themeFile`          | —              | Path, relative to the current working directory, to a CSSX `@theme` file. It is reread when CSS is generated; Rollup-compatible adapters register it as a watched dependency. Do not use it with `theme`. |
| `darkMode`           | `media`        | Activates `dark:` utilities with the system color-scheme media query (`media`), `[data-theme=dark]` (`selector`), or a `.dark` ancestor (`class`). Use the selector that matches your theme controller.   |
| `preflight`          | `true`         | Adds Tailwind-compatible browser baseline rules before utilities. Set it to `false` only when the application deliberately owns a different global reset.                                                 |

The universal adapter validates options when it is created. `theme` and `themeFile` cannot be used together. Invalid CSS paths and layer names fail the build before CSS is emitted.

CSSX emits the Tailwind-compatible browser baseline by default, so utility
migrations retain box sizing, inherited typography, link treatment, and native
form-control normalization. Set `preflight: false` only when an existing app
stylesheet deliberately owns different global element styles.

## Extracted CSS

Each production adapter collects CSS from the source files used by the final build. It does not create a CSS file when no used file has CSSX utilities. The default file is `cssx.css`. Set `cssFileName` to use another relative path. CSSX emits one composite class in markup for each static style composition while sharing declarations across composite selectors in the stylesheet.

For legacy `stableClassNames: true` with webpack or Rspack, CSSX scans the project source tree before emitting its public stylesheet. The Next.js integration owns the source preparation pass and does not require consumers to add a scanner, asset remapper, stylesheet link, or plugin hook.

The Rollup-compatible adapters retain transformed module metadata until `generateBundle`, then emit CSS and its map as build assets. The webpack and Rspack adapters retain metadata on native modules and emit assets at the additions stage of `processAssets`. The direct esbuild adapter enables the metafile, removes data for source files absent from it, and generates CSS in `onEnd`.

When `sourceMap` is enabled and source locations are available, generated CSS has a separate `.css.map` file and a source-map comment. Each mapping points to the source module location of the static utility string that created the rule. `transformCssxModule` can accept and return JavaScript source maps for build tools that provide a compatible input map.

During local development, the Vite adapter serves the configured `cssFileName` path from memory, including a source map when one exists. Add a matching stylesheet link to your document. CSSX injects a small page script that refreshes matching stylesheet links after source changes or deletions. Production adapters create the same CSS file, and your app must include it.

With esbuild, `outdir` places CSS below that directory. `outfile` places it beside the output file. Without either option, it is placed below the working directory. With `write: false`, CSS and its map are appended to esbuild's in-memory `outputFiles`; otherwise they are written to disk. A later esbuild build removes CSS files that CSSX wrote when no utilities remain.

See the [workspace README](../../README.md) for CSSX syntax, supported utilities, and current exclusions.
