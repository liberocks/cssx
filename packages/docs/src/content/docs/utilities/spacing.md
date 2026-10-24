---
title: 'Spacing'
description: 'Padding, margins, gaps, and sibling spacing.'
section: 'Utilities'
order: 8
keywords:
  - 'spacing'
  - 'padding'
  - 'margin'
  - 'gap'
  - 'space'
---

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
