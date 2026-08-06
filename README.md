# CSSX

CSSX turns static utility strings into class names and CSS when you build your app. It keeps a small helper in the browser for styles that change at runtime.

## Packages

| Package                                                   | Purpose                                                |
| --------------------------------------------------------- | ------------------------------------------------------ |
| [`@cssxio/cssx`](packages/cssx/README.md)                 | The `create`, `props`, and `sx` runtime API.           |
| [`@cssxio/compiler`](packages/compiler/README.md)         | Static utility compilation and CSS output.             |
| [`@cssxio/babel-plugin`](packages/babel-plugin/README.md) | Source transform for static CSSX calls.                |
| [`@cssxio/unplugin`](packages/unplugin/README.md)         | Build tool adapters that create the CSS file.          |
| [`cssx-intellisense`](packages/intellisense/README.md)    | Editor completion and hover help for static utilities. |
| [`@cssxio/docs`](packages/docs)                           | The CSSX documentation site.                           |

Install the runtime plus a compiler integration:

```sh
pnpm add @cssxio/cssx
pnpm add -D @cssxio/unplugin
```

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
