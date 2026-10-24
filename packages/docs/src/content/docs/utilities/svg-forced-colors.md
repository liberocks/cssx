---
title: 'SVG and forced colors'
description: 'SVG paint and stroke controls, rendering hints, and forced-color behavior.'
section: 'Utilities'
order: 17
keywords:
  - 'svg'
  - 'fill'
  - 'stroke'
  - 'forced colors'
---

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
