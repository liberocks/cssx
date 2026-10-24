---
title: 'Position, sizing, and aspect ratio'
description: 'Position, insets, dimensions, aspect ratios, and container widths.'
section: 'Utilities'
order: 4
keywords:
  - 'position'
  - 'inset'
  - 'width'
  - 'height'
  - 'size'
  - 'aspect ratio'
  - 'container'
---

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
