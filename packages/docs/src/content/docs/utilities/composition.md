---
title: 'Composition'
description: 'How compiled CSSX styles merge and resolve conflicting utility channels.'
section: 'Advanced'
order: 22
keywords:
  - composition
  - merge
  - conflicts
  - cascade
---

CSSX stores the style groups that each compiled style changes. The browser can
then merge compiled styles without reading utility syntax.

| Composition                                                 | Result                                             |
| ----------------------------------------------------------- | -------------------------------------------------- |
| Broad directional utility followed by a narrower one        | Only the overlapping declaration atom is replaced. |
| Same semantic write group                                   | The later compiled style wins.                     |
| Logical and physical writes                                 | Remain independently composable.                   |
| Filters, backdrop filters, transforms, gradients, and rings | Their channels compose independently.              |
| `normal-nums`, `filter-none`, `backdrop-filter-none`        | Reset all related channels.                        |
| `space-*` and `divide-*`                                    | Remain a child-selector-scoped atom.               |

#### Example

```tsx
const styles = cssx.create({
  base: 'px-4 scale-95',
  override: 'pr-2 scale-x-105',
});

<div {...cssx.props(styles.base, styles.override)} />;
```

`create` input is intentionally static. Dynamic utility strings should remain
raw class strings or be modeled as explicit static style choices.
