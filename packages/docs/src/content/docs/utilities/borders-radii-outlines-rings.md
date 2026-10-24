---
title: 'Borders, radii, outlines, and rings'
description: 'Border widths, dividers, radii, outlines, and composable rings.'
section: 'Utilities'
order: 12
keywords:
  - 'border'
  - 'radius'
  - 'outline'
  - 'ring'
  - 'divide'
---

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

Color forms are documented in [Colors](/docs/utilities/colors). Dividers apply to every child
except the last, and rings compose with regular shadows.

#### Example

```tsx
const styles = cssx.create({
  panel: 'border border-blue-500 rounded-lg outline outline-2 outline-blue-500 ring-2 ring-blue-500/50',
});

<section {...cssx.props(styles.panel)} />;
```
