# @cssxio/unplugin

CSSX has build tool adapters at these entrypoints:

```ts
import cssxVite from '@cssxio/unplugin/vite';
import cssxRollup from '@cssxio/unplugin/rollup';
import cssxWebpack from '@cssxio/unplugin/webpack';
import cssxRspack from '@cssxio/unplugin/rspack';
import cssxEsbuild from '@cssxio/unplugin/esbuild';
```

Add the selected adapter to your build tool `plugins` setting:

```ts
// vite.config.ts
import cssx from '@cssxio/unplugin/vite';
export default { plugins: [cssx()] };
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
import { build } from 'esbuild';
import cssx from '@cssxio/unplugin/esbuild';

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

| Option         | Default        | What it does                                                                                                                                                                                              |
| -------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `importSource` | `@cssxio/cssx` | Module specifier that identifies source files to transform. A source file must contain this text and have a JavaScript or TypeScript extension.                                                           |
| `cssFileName`  | `cssx.css`     | Relative CSS output path. It must be non-empty, end in `.css`, and stay within the bundler output directory. `[hash]` is replaced with a stable hash of the generated CSS.                                |
| `sourceMap`    | `true`         | Whether to generate a separate CSS source map. Set it to `false` to omit both the `.css.map` file and source-map comment.                                                                                 |
| `layer`        | —              | CSS layer name that wraps generated CSS. It must be a single valid layer identifier, such as `cssx`.                                                                                                      |
| `theme`        | —              | Inline CSSX `@theme` source used while transforming and compiling CSS. The theme is compiled into generated rules; it does not add a global stylesheet.                                                   |
| `themeFile`    | —              | Path, relative to the current working directory, to a CSSX `@theme` file. It is reread when CSS is generated; Rollup-compatible adapters register it as a watched dependency. Do not use it with `theme`. |
| `darkMode`     | `media`        | Activates `dark:` utilities with the system color-scheme media query (`media`), `[data-theme=dark]` (`selector`), or a `.dark` ancestor (`class`). Use the selector that matches your theme controller.   |
| `preflight`    | `false`        | Adds CSSX's opt-in browser baseline before utilities. It resets common element, link, form-control, button, and box-model defaults for utility-framework migrations.                                      |

The universal adapter validates options when it is created. `theme` and `themeFile` cannot be used together. Invalid CSS paths and layer names fail the build before CSS is emitted.

CSSX generates utility CSS only by default. Set `preflight: true` to add its
opt-in browser baseline; leave it disabled when an existing app stylesheet
already owns global element styles.

## Extracted CSS

Each production adapter collects CSS from the source files used by the final build. It does not create a CSS file when no used file has CSSX utilities. The default file is `cssx.css`. Set `cssFileName` to use another relative path. CSSX emits one composite class in markup for each static style composition while sharing declarations across composite selectors in the stylesheet.

The Rollup-compatible adapters retain transformed module metadata until `generateBundle`, then emit CSS and its map as build assets. The webpack and Rspack adapters retain metadata on native modules and emit assets at the additions stage of `processAssets`. The direct esbuild adapter enables the metafile, removes data for source files absent from it, and generates CSS in `onEnd`.

When `sourceMap` is enabled and source locations are available, generated CSS has a separate `.css.map` file and a source-map comment. Each mapping points to the source module location of the static utility string that created the rule. `transformCssxModule` can accept and return JavaScript source maps for build tools that provide a compatible input map.

During local development, the Vite adapter serves the configured `cssFileName` path from memory, including a source map when one exists. Add a matching stylesheet link to your document. CSSX injects a small page script that refreshes matching stylesheet links after source changes or deletions. Production adapters create the same CSS file, and your app must include it.

With esbuild, `outdir` places CSS below that directory. `outfile` places it beside the output file. Without either option, it is placed below the working directory. With `write: false`, CSS and its map are appended to esbuild's in-memory `outputFiles`; otherwise they are written to disk. A later esbuild build removes CSS files that CSSX wrote when no utilities remain.

See the [workspace README](../../README.md) for CSSX syntax, supported utilities, and current exclusions.
