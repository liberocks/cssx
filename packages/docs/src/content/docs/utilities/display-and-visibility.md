---
title: 'Display and visibility'
description: 'Display modes, visibility, table display, and screen-reader-only helpers.'
section: 'Utilities'
order: 2
keywords:
  - 'display'
  - 'visibility'
  - 'block'
  - 'inline'
  - 'hidden'
  - 'screen reader'
---

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
