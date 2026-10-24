---
title: 'General layout'
description: 'Columns, breaks, overflow, object fitting, floats, and related layout behavior.'
section: 'Utilities'
order: 3
keywords:
  - 'layout'
  - 'columns'
  - 'overflow'
  - 'object fit'
  - 'float'
  - 'clear'
---

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
