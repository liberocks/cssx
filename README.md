# CSSX

CSSX turns static utility strings into class names and CSS when you build your app. It keeps a small helper in the browser for styles that change at runtime.

## Packages

| Package                                                   | Purpose                                                |
| --------------------------------------------------------- | ------------------------------------------------------ |
| [`@cssxio/cssx`](packages/cssx/README.md)                 | The `create`, `props`, and `sx` runtime API.           |
| [`@cssxio/html`](packages/html/README.md)                 | Zero-build runtime styling for ordinary HTML.          |
| [`@cssxio/compiler`](packages/compiler/README.md)         | Static utility compilation and CSS output.             |
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

## Compiler Setup

```js
// babel.config.js
export default {
  plugins: ['@cssxio/babel-plugin'],
};
```

The adapter package has an entrypoint for each supported build tool. Use `importSource` for a custom runtime module. Use `cssFileName` for the CSS file name. Use `layer` to wrap the generated CSS in a CSS layer. Use either `theme` or `themeFile` for CSSX `@theme` input. The CSS file name must be a relative `.css` path. It can include `[hash]`.

During local development, the adapter serves the configured CSS path from memory and refreshes the matching stylesheet link after a CSSX source change. Keep the `<link rel="stylesheet">` in your document. Do not add the generated stylesheet to source control.

```ts
import cssx from '@cssxio/unplugin';

export default {
  plugins: [cssx({ cssFileName: 'assets/cssx.css' })],
};
```

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
`s1x`, …). To bound hashed names, set its hash fragment length, for example
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

### Syntax and values

| Class                             | Styles                                                                                |
| --------------------------------- | ------------------------------------------------------------------------------------- |
| `-<utility>`                      | Negates supported spacing, dimensions, order, angles, hue rotation, and scale values. |
| `!<utility>` or `<utility>!`      | Marks every declaration emitted by the utility as `!important`.                       |
| `<family>-[value]`                | Provides a validated static arbitrary value for that family.                          |
| `<supported-family>-(--property)` | Uses `var(--property)` where that family accepts custom properties.                   |
| `[property:value]`                | Emits one validated static declaration.                                               |

#### Example

```tsx
const styles = cssx.create({
  card: 'sm:!-mt-2 bg-position-(--hero-position)',
});

<article {...cssx.props(styles.card)} />;
```

### Display and visibility

| Class                                                                                                       | Styles                                                          |
| ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `block`, `inline-block`, `inline`, `flex`, `inline-flex`, `grid`, `inline-grid`                             | Corresponding `display` value.                                  |
| `flow-root`, `contents`, `list-item`, `hidden`                                                              | `display: flow-root`, `contents`, `list-item`, or `none`.       |
| `table`, `inline-table`, `table-{caption,cell,column,column-group,footer-group,header-group,row,row-group}` | Corresponding table `display` value.                            |
| `visible`, `invisible`                                                                                      | `visibility: visible` or `hidden`.                              |
| `sr-only`, `not-sr-only`                                                                                    | Applies or resets the screen-reader-only clipping declarations. |

#### Example

```tsx
const styles = cssx.create({
  label: 'sr-only',
  menu: 'hidden md:flex',
});

<>
  <span {...cssx.props(styles.label)}>Navigation</span>
  <nav {...cssx.props(styles.menu)} />
</>;
```

### General layout

| Class                                                                                                                        | Styles                                                 |
| ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `columns-{auto,n,[value],(--property)}`                                                                                      | `columns`.                                             |
| `break-{before,after}-{auto,avoid,all,avoid-page,page,left,right,column}`                                                    | `break-before` or `break-after`.                       |
| `break-inside-{auto,avoid,avoid-page,avoid-column}`                                                                          | `break-inside`.                                        |
| `box-{border,content}`                                                                                                       | `box-sizing`.                                          |
| `box-decoration-{slice,clone}`                                                                                               | `box-decoration-break`, including the WebKit fallback. |
| `float-{start,end,left,right,none}`, `clear-{start,end,left,right,both,none}`                                                | `float` or `clear`.                                    |
| `overflow[-x/-y]-{auto,hidden,clip,visible,scroll}`                                                                          | `overflow`, `overflow-x`, or `overflow-y`.             |
| `overscroll[-x/-y]-{auto,contain,none}`                                                                                      | `overscroll-behavior` channels.                        |
| `isolate`, `isolation-auto`                                                                                                  | `isolation: isolate` or `auto`.                        |
| `object-{contain,cover,fill,none,scale-down}`                                                                                | `object-fit`.                                          |
| `object-{top-left,top,top-right,left,center,right,bottom-left,bottom,bottom-right}`, `object-[value]`, `object-(--property)` | `object-position`.                                     |

#### Example

```tsx
const styles = cssx.create({
  image: 'columns-3 break-inside-avoid overflow-x-auto object-cover object-center',
});

<img {...cssx.props(styles.image)} alt="" />;
```

### Position, sizing, and aspect ratio

| Class                                                     | Styles                                                      |
| --------------------------------------------------------- | ----------------------------------------------------------- |
| `static`, `fixed`, `absolute`, `relative`, `sticky`       | `position`.                                                 |
| `top/right/bottom/left-<value>`                           | Corresponding physical inset.                               |
| `inset[-x/-y]-<value>`                                    | `inset`, both horizontal sides, or both vertical sides.     |
| `inset-s-*`, `start-*`, `inset-e-*`, `end-*`              | Logical inline insets.                                      |
| `z-{n,auto}`                                              | `z-index`.                                                  |
| `w/h/min-w/max-w/min-h/max-h-<value>`                     | Physical dimensions.                                        |
| `inline/min-inline/max-inline-<value>`                    | Logical inline dimensions.                                  |
| `block/min-block/max-block-<value>`                       | Logical block dimensions.                                   |
| `size-<value>`                                            | Sets both width and height.                                 |
| `max-{w,inline}-{xs,sm,md,lg,xl,2xl,3xl,4xl,5xl,6xl,7xl}` | Named maximum inline or physical width.                     |
| `aspect-{auto,square,video,[ratio]}`                      | `aspect-ratio`.                                             |
| `container`                                               | `width: 100%` and active `sm` through `2xl` maximum widths. |

`<value>` accepts supported spacing values, `auto`, `full`, `screen`, fractions,
and family-specific arbitrary values. Logical and physical writes remain
independently composable.

#### Example

```tsx
const styles = cssx.create({
  media: 'relative inset-s-4 top-2 z-10 inline-full max-inline-lg aspect-video',
});

<video {...cssx.props(styles.media)} />;
```

### Tables

| Class                                                      | Styles                                            |
| ---------------------------------------------------------- | ------------------------------------------------- |
| `border-{collapse,separate}`                               | `border-collapse`.                                |
| `border-spacing-<spacing>`                                 | `border-spacing`.                                 |
| `border-spacing-x-<spacing>`, `border-spacing-y-<spacing>` | Composed horizontal or vertical `border-spacing`. |
| `table-{auto,fixed}`                                       | `table-layout`.                                   |
| `caption-{top,bottom}`                                     | `caption-side`.                                   |

#### Example

```tsx
const styles = cssx.create({
  report: 'border-separate border-spacing-x-4 border-spacing-y-2 table-fixed',
});

<table {...cssx.props(styles.report)} />;
```

### Flexbox and alignment

| Class                                                              | Styles                                                       |
| ------------------------------------------------------------------ | ------------------------------------------------------------ |
| `flex-{row,row-reverse,col,col-reverse}`                           | `flex-direction`.                                            |
| `flex-{wrap,wrap-reverse,nowrap}`                                  | `flex-wrap`.                                                 |
| `flex-{auto,initial,none}`                                         | `flex: 1 1 auto`, `0 1 auto`, or `none`.                     |
| `flex-<n>`, `flex-<fraction>`, `flex-[value]`, `flex-(--property)` | `flex` shorthand. Fractions become a percentage calculation. |
| `grow`, `grow-0`, `shrink`, `shrink-0`                             | `flex-grow` or `flex-shrink`.                                |
| `basis-<value>`                                                    | `flex-basis`.                                                |
| `order-{first,last,none,n}`                                        | `order`. Negative numeric forms are supported.               |
| `items-{start,center,end,stretch,baseline}`                        | `align-items`.                                               |
| `self-{auto,start,center,end,stretch,baseline}`                    | `align-self`.                                                |
| `justify-{start,center,end,between,around,evenly}`                 | `justify-content`.                                           |
| `justify-items-{start,center,end,stretch}`                         | `justify-items`.                                             |
| `justify-self-{auto,start,center,end,stretch}`                     | `justify-self`.                                              |
| `place-items-{start,center,end,stretch,baseline}`                  | `place-items`.                                               |
| `place-self-{auto,start,center,end,stretch}`                       | `place-self`.                                                |
| `place-content-{start,center,end,between,around,evenly,stretch}`   | `place-content`.                                             |

#### Example

```tsx
const styles = cssx.create({
  toolbar: 'flex flex-col md:flex-row items-center justify-between gap-4',
  search: 'basis-1/2 grow',
});

<div {...cssx.props(styles.toolbar)}>
  <input {...cssx.props(styles.search)} />
</div>;
```

### Grid

| Class                                       | Styles                                                     |
| ------------------------------------------- | ---------------------------------------------------------- |
| `grid-cols-<n>`, `grid-rows-<n>`            | Repeating `grid-template-columns` or `grid-template-rows`. |
| `grid-{cols,rows}-subgrid`                  | A `subgrid` template.                                      |
| `{col,row}-span-<n>`, `{col,row}-span-full` | `grid-column` or `grid-row` span.                          |
| `{col,row}-{start,end}-{n,auto}`            | Grid line placement.                                       |
| `grid-flow-{row,col,row-dense,col-dense}`   | `grid-auto-flow`.                                          |
| `auto-{cols,rows}-{auto,min,max,fr}`        | `grid-auto-columns` or `grid-auto-rows`.                   |

#### Example

```tsx
const styles = cssx.create({
  gallery: 'grid grid-cols-3 grid-flow-row-dense auto-rows-fr gap-4',
  feature: 'col-span-2 row-start-3',
});

<div {...cssx.props(styles.gallery)}>
  <article {...cssx.props(styles.feature)} />
</div>;
```

### Spacing

| Class                                                 | Styles                                                  |
| ----------------------------------------------------- | ------------------------------------------------------- |
| `p/px/py/pt/pr/pb/pl/ps/pe-<spacing>`                 | Physical or logical padding.                            |
| `m/mx/my/mt/mr/mb/ml/ms/me-<spacing>`                 | Physical or logical margin. Margins also accept `auto`. |
| `gap-<spacing>`, `gap-x-<spacing>`, `gap-y-<spacing>` | `gap`, `column-gap`, or `row-gap`.                      |
| `space-x-<spacing>`, `space-y-<spacing>`              | Child margins on every child except the last.           |
| `space-{x,y}-reverse`                                 | Reverses the matching child-spacing direction.          |

`<spacing>` accepts `px`, `full`, numeric values resolved through `--spacing`,
and supported arbitrary values. Negative forms are supported where CSS accepts
them.

#### Example

```tsx
const styles = cssx.create({
  card: 'px-4 py-2 -mt-2',
  stack: 'space-y-2',
});

<section {...cssx.props(styles.card)}>
  <div {...cssx.props(styles.stack)} />
</section>;
```

### Typography

| Class                                                                                                                                                    | Styles                                                                 |
| -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `font-{sans,serif,mono}`, `font-[value]`, `font-(--property)`                                                                                            | Built-in or custom `font-family`.                                      |
| `font-{thin,extralight,light,normal,medium,semibold,bold,extrabold,black}`                                                                               | `font-weight` from 100 through 900.                                    |
| `antialiased`, `subpixel-antialiased`                                                                                                                    | Font smoothing declarations.                                           |
| `italic`, `not-italic`                                                                                                                                   | `font-style`.                                                          |
| `text-{xs,sm,base,lg,xl,2xl}`, `text-[length]`                                                                                                           | Font size; named sizes include a default line height.                  |
| `leading-{none,tight,snug,normal,relaxed,loose,[value]}`                                                                                                 | `line-height`.                                                         |
| `tracking-{tighter,tight,normal,wide,wider,widest}`                                                                                                      | `letter-spacing`.                                                      |
| `text-{left,center,right,justify}`                                                                                                                       | `text-align`.                                                          |
| `uppercase`, `lowercase`, `capitalize`, `normal-case`                                                                                                    | `text-transform`.                                                      |
| `ordinal`, `slashed-zero`, `lining-nums`, `oldstyle-nums`, `proportional-nums`, `tabular-nums`, `diagonal-fractions`, `stacked-fractions`, `normal-nums` | Composable `font-variant-numeric` controls; `normal-nums` resets them. |
| `underline`, `overline`, `line-through`, `no-underline`                                                                                                  | `text-decoration-line`.                                                |
| `decoration-{solid,double,dotted,dashed,wavy}`                                                                                                           | `text-decoration-style`.                                               |
| `decoration-{auto,from-font,n,[value],(--property)}`                                                                                                     | `text-decoration-thickness`.                                           |
| `underline-offset-{auto,n,[value],(--property)}`                                                                                                         | `text-underline-offset`.                                               |
| `truncate`, `text-{ellipsis,clip}`                                                                                                                       | Text overflow behavior.                                                |
| `text-{wrap,nowrap,balance,pretty}`, `wrap-{anywhere,break-word,normal}`                                                                                 | Text wrapping behavior.                                                |
| `hyphens-{none,manual,auto}`, `whitespace-{normal,nowrap,pre,pre-line,pre-wrap,break-spaces}`                                                            | Hyphenation or whitespace.                                             |
| `tab-{n,[value],(--property)}`                                                                                                                           | `tab-size`.                                                            |
| `list-{inside,outside}`, `list-{none,disc,decimal}`, `list-image-{none,[value],(--property)}`                                                            | List styling.                                                          |
| `line-clamp-{n,none}`                                                                                                                                    | WebKit line-clamp declaration bundle.                                  |
| `content-none`, `content-[value]`, `content-(--property)`                                                                                                | `content`, typically with `before:` or `after:`.                       |
| `writing-{horizontal-tb,vertical-rl,vertical-lr}`, `text-orientation-{mixed,upright,sideways}`, `text-combine-upright-{none,all}`                        | Writing mode and vertical text controls.                               |
| `unicode-bidi-{normal,embed,isolate,bidi-override,isolate-override,plaintext}`                                                                           | Bidirectional-text handling.                                           |
| `font-optical-{auto,none}`, `font-kerning-{auto,normal,none}`, `font-synthesis-{none,weight,style,small-caps,position}`                                  | Advanced font rendering controls.                                      |

#### Example

```tsx
const styles = cssx.create({
  title: 'font-sans text-lg font-semibold leading-tight tracking-wide tabular-nums',
  required: "before:content-['required'] before:text-red-600",
});

<h2 {...cssx.props(styles.title, styles.required)}>Invoice 0042</h2>;
```

### Colors

| Class                                                      | Styles                                        |
| ---------------------------------------------------------- | --------------------------------------------- |
| `bg-<color>`, `text-<color>`, `border-<color>`             | Background, foreground, or border color.      |
| `outline-<color>`, `divide-<color>`, `placeholder-<color>` | Outline, child divider, or placeholder color. |
| `accent-<color>`, `caret-<color>`                          | Accent or caret color.                        |
| `fill-<color>`, `stroke-<color>`                           | SVG paint color.                              |
| `ring-<color>`, `ring-offset-<color>`                      | Ring or ring-offset color channel.            |
| `<color-utility>/<0..100>` or `<color-utility>/[number]`   | Applies color opacity with `color-mix()`.     |

The default palette has 50-950 shades for `red`, `orange`, `amber`, `yellow`,
`lime`, `green`, `emerald`, `teal`, `cyan`, `sky`, `blue`, `indigo`, `violet`,
`purple`, `fuchsia`, `pink`, `rose`, `slate`, `gray`, `zinc`, `neutral`,
`stone`, `mauve`, `olive`, `mist`, `taupe`, `blue-gray`, `brown`, `deep-orange`,
`light-green`, `light-blue`, and `deep-purple`, plus `black`, `white`, and
`transparent`. Hyphenated family names work in every color utility, such as
`bg-deep-orange-500`, `text-blue-gray-950`, and `border-light-green-200`.

#### Example

```tsx
const styles = cssx.create({
  input: 'bg-blue-600 text-white border-blue-700/50 placeholder-slate-500',
});

<input {...cssx.props(styles.input)} placeholder="Project name" />;
```

### Backgrounds and gradients

| Class                                                                                        | Styles                                                |
| -------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `bg-none`, `bg-[image]`                                                                      | `background-image`.                                   |
| `bg-{auto,cover,contain}`                                                                    | `background-size`.                                    |
| `bg-{top-left,top,top-right,left,center,right,bottom-left,bottom,bottom-right}`              | `background-position`.                                |
| `bg-{repeat,no-repeat,repeat-x,repeat-y,repeat-round,repeat-space}`                          | `background-repeat`.                                  |
| `bg-{fixed,local,scroll}`                                                                    | `background-attachment`.                              |
| `bg-clip-{border,padding,content,text}`, `bg-origin-{border,padding,content}`                | Background clip or origin.                            |
| `bg-position-[value]`, `bg-position-(--property)`, `bg-size-[value]`, `bg-size-(--property)` | Custom position or size.                              |
| `bg-linear-to-{t,tr,r,br,b,bl,l,tl}`                                                         | Directional `linear-gradient()`.                      |
| `bg-linear-{angle,[angle]}`                                                                  | Angled `linear-gradient()`.                           |
| `from/via/to-<color>`, `from/via/to-<0..100%>`                                               | Composable gradient color and stop-position channels. |

Use `_` for spaces in bracketed values and `\_` for a literal underscore.

#### Example

```tsx
const styles = cssx.create({
  banner: 'bg-linear-to-r/oklch from-blue-500 via-violet-500 to-pink-500 bg-cover',
});

<section {...cssx.props(styles.banner)} />;
```

### Borders, radii, outlines, and rings

| Class                                                     | Styles                            |
| --------------------------------------------------------- | --------------------------------- |
| `border`, `border-{0,2,4,8}`                              | All-side border width.            |
| `border-{x,y,t,r,b,l}`, `border-{x,y,t,r,b,l}-{0,2,4,8}`  | Selected border width.            |
| `rounded`, `rounded-{none,sm,md,lg,xl,2xl,full}`          | `border-radius`.                  |
| `divide-{x,y}[-{0,2,4,8,[value]}]`                        | Child-scoped divider widths.      |
| `divide-{x,y}-reverse`                                    | Reverses divider direction.       |
| `outline`                                                 | Solid 1px outline.                |
| `outline-{none,hidden,solid,dashed,dotted,double}`        | Outline style or reset.           |
| `outline-{0,1,2,4,8,[value]}`, `outline-offset-<spacing>` | Outline width or offset.          |
| `ring`, `ring-{0,2,4,8,[value]}`                          | Composable ring width and shadow. |
| `ring-offset-{0,2,4,8,[value]}`                           | Ring offset width.                |

Color forms are documented in [Colors](#colors). Dividers apply to every child
except the last, and rings compose with regular shadows.

#### Example

```tsx
const styles = cssx.create({
  panel: 'border border-blue-500 rounded-lg outline outline-2 outline-blue-500 ring-2 ring-blue-500/50',
});

<section {...cssx.props(styles.panel)} />;
```

### Effects, filters, and masks

| Class                                                                                                                             | Styles                               |
| --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `shadow`, `shadow-{sm,md,lg,xl,none}`                                                                                             | Composable `box-shadow` channel.     |
| `opacity-<n>`                                                                                                                     | `opacity: n / 100`.                  |
| `filter-none`                                                                                                                     | Resets filter channels.              |
| `blur-{none,xs,sm,md,lg,xl,2xl,3xl,[value]}`                                                                                      | Composable `blur()`.                 |
| `brightness-*`, `contrast-*`, `saturate-*`, `grayscale[-0]`, `hue-rotate-{n,[value]}`, `invert[-0]`, `sepia[-0]`, `drop-shadow-*` | Composable `filter` channels.        |
| `backdrop-filter-none`                                                                                                            | Resets backdrop-filter channels.     |
| `backdrop-{blur,brightness,contrast,grayscale,hue-rotate,invert,opacity,saturate,sepia}-*`                                        | Composable backdrop-filter channels. |
| `mask-none`, `mask-[image]`, `mask-(--property)`                                                                                  | `mask-image`.                        |
| `mask-{cover,contain}`, `mask-{repeat,no-repeat,repeat-x,repeat-y,repeat-round,repeat-space}`                                     | Mask size or repeat.                 |
| `mask-clip-{border,padding,content}`, `mask-no-clip`, `mask-origin-{border,padding,content}`                                      | Mask clipping or origin.             |
| `mask-{position,size}-[value]`, `mask-{position,size}-(--property)`                                                               | Custom mask position or size.        |

#### Example

```tsx
const styles = cssx.create({
  portrait: 'shadow-md opacity-90 blur-sm backdrop-blur-md mask-[url("/mask.svg")] mask-cover',
});

<img {...cssx.props(styles.portrait)} alt="" />;
```

### Transitions, animation, and transforms

| Class                                                                                                                                                                                      | Styles                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| `transition`, `transition-{none,all,colors,opacity,shadow,transform,transform-opacity,filter,size,[value]}`                                                                                | Transition property and default timing.     |
| `transition-{normal,discrete}`                                                                                                                                                             | `transition-behavior`.                      |
| `duration-{n,theme,[value],(--property)}`, `delay-{n,theme,[value],(--property)}`                                                                                                          | Transition duration or delay.               |
| `ease-{linear,in,out,in-out,theme,[value],(--property)}`                                                                                                                                   | Transition timing function.                 |
| `motion-safe:*`, `motion-reduce:*`, `starting:*`                                                                                                                                           | Motion preference or entry-style variant.   |
| `animate-none`, `animate-{spin,ping,pulse,bounce,fade-in,fade-out,slide-in-*,scale-in,scale-out,shimmer}`, `animate-<theme-name>`, `animate-[value]`                                       | Animation. Only used keyframes are emitted. |
| `animation-name-{none,preset,theme,[value]}`, `animation-composition-{replace,add,accumulate}`                                                                                             | Animation name or composition.              |
| `animation-duration-{n,theme,[value],(--property)}`, `animation-delay-{n,theme,[value],(--property)}`                                                                                      | Independent animation duration or delay.    |
| `animation-ease-{linear,in,out,in-out,theme,[value],(--property)}`                                                                                                                         | Independent animation timing function.      |
| `animation-iterations-{1,2,3,infinite}`, `animation-direction-{normal,reverse,alternate,alternate-reverse}`, `animation-fill-{none,forwards,backwards,both}`, `animation-{running,paused}` | Independent animation playback controls.    |
| `stagger-*`, `stagger-index-*`, `stagger-count-*`, `stagger-reverse`, `{animation-,}delay-stagger`                                                                                         | Explicit CSS stagger channels.              |
| `animation-timeline-*`, `{scroll,view}-timeline-*`, `timeline-scope-*`, `animation-range-*`                                                                                                | Progress timelines and attachment ranges.   |
| `view-transition-{name,class}-*`, `vt-{old,new,group,image-pair}-[target]:*`                                                                                                               | Native snapshot capture and styling.        |
| `translate-{x,y}-<spacing>`                                                                                                                                                                | Composable individual `translate`.          |
| `rotate-{n,[value]}`                                                                                                                                                                       | Individual `rotate`.                        |
| `scale[-x/-y]-{n,[value]}`                                                                                                                                                                 | Composable individual `scale`.              |
| `skew-{x,y}-{n,[value]}`                                                                                                                                                                   | Composable `transform` skew channel.        |

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

| Class                                                                                  | Styles                                                                         |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `content-visibility-{visible,auto,hidden}`                                             | `content-visibility`.                                                          |
| `contain-{none,content,strict,size,inline-size,layout,style,paint}`, `contain-[value]` | CSS containment. Use underscores for spaces, such as `contain-[layout_paint]`. |
| `contain-intrinsic-{size,inline-size,block-size}-{n,[value],(--property)}`             | Intrinsic fallback size for contained content.                                 |
| `image-render-{auto,crisp-edges,pixelated}`                                            | Image interpolation behavior.                                                  |

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
| `[&>svg]:`, `[&.is-active]:`, `[@supports(...)]:`, `[@media ...]:`                                                                                                                                                                                                                                 | Safe arbitrary selector or at-rule condition.                                 |

Arbitrary selector variants must contain `&`; only static selectors and
supported at-rules are accepted.

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
- `pnpm generate:tailwind-corpus` regenerates the complete Tailwind 4 compatibility manifest from an ignored Tailwind 4.x `experiments/tailwindcss` clone.
- `pnpm test:package-contract` builds packages and checks their public files, dependencies, file sizes, and import time.
- `pnpm lint` checks source files and tests with ESLint.
- `pnpm typecheck` checks workspace types.
- `pnpm test:release` runs formatting, linting, coverage, package checks, and type checks.

## npm releases

The **npm-release** workflow requires an explicit package and version-bump type.
It first validates `main`, then creates a version-bump PR for that package. The
release App is the only actor that can bypass protected checks to merge this
specific PR, preserving an auditable PR trail without repeating CI for a
package-version-only change. The merged commit is still verified before the
package is built, published, and tagged. GitHub repository auto-merge remains
disabled for ordinary pull requests.

Configure npm trusted publishing separately for each public package, with
repository `liberocks/cssx` and workflow file `npm-release.yml`. Do not select
an npm environment: this workflow does not use a GitHub Actions environment.
It has the required OIDC `id-token: write` permission and therefore publishes
without an npm token.

If a release fails after its version-bump PR has merged but before npm accepts
the publish, first correct the trusted-publisher setting. Then rerun
**npm-release** for the same package with **retry existing version** enabled.
That guarded mode verifies `main` and publishes only the current version when
it is still unpublished and has no tag; it neither creates another version-bump
PR nor skips ahead to a new version. The chosen bump value is ignored in retry
mode.

Create a repository GitHub App with **Contents: read and write** and **Pull
requests: read and write** permissions, install it on this repository, and add
its ID and PEM private key as the `RELEASE_APP_ID` and
`RELEASE_APP_PRIVATE_KEY` Actions secrets. The workflow uses its short-lived
installation token only for release branches, PRs, tags, and releases.

The Tailwind corpus test exercises every finite candidate in the checked-out
Tailwind 4.x upstream IntelliSense snapshot. The checked-in manifest records
supported candidates and explicit rejections, so compatibility changes cannot
be silent. CSSX-only utility families are covered by the compiler
conformance and capability tests. Statement, branch, function, and line coverage
thresholds remain 100%; production code is not excluded to meet them.

Historical compatibility references are documented in [`packages/compiler/THIRD_PARTY_NOTICES.md`](packages/compiler/THIRD_PARTY_NOTICES.md).
