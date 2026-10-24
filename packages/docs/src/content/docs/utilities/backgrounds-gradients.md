---
title: 'Backgrounds and gradients'
description: 'Background image, size, position, repeat, attachment, and gradients.'
section: 'Utilities'
order: 11
keywords:
  - 'background'
  - 'gradient'
  - 'image'
  - 'color stop'
---

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
