---
title: 'Flexbox and alignment'
description: 'Flex direction, wrapping, sizing, alignment, and ordering.'
section: 'Utilities'
order: 6
keywords:
  - 'flex'
  - 'alignment'
  - 'justify'
  - 'place'
  - 'order'
---

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
