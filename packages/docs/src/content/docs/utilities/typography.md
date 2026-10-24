---
title: 'Typography'
description: 'Font, text, list, writing-mode, and line-clamp utilities.'
section: 'Utilities'
order: 9
keywords:
  - 'typography'
  - 'font'
  - 'text'
  - 'line height'
  - 'letter spacing'
  - 'whitespace'
  - 'list'
---

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
