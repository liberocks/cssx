---
title: 'Grid'
description: 'Grid templates, spans, line placement, and auto-flow.'
section: 'Utilities'
order: 7
keywords:
  - 'grid'
  - 'grid template'
  - 'grid flow'
  - 'column span'
  - 'row span'
---

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
