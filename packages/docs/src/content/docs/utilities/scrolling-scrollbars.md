---
title: 'Scrolling and scrollbars'
description: 'Scroll margin and padding, behavior, snap, scrollbar, and gutter utilities.'
section: 'Utilities'
order: 16
keywords:
  - 'scroll'
  - 'scrollbar'
  - 'snap'
  - 'overscroll'
---

| Class                                                | Styles                              |
| ---------------------------------------------------- | ----------------------------------- |
| `scroll-{m,mx,my,mt,mr,mb,ml}-<spacing>`             | Physical scroll margin.             |
| `scroll-{p,px,py,pt,pr,pb,pl}-<spacing>`             | Physical scroll padding.            |
| `scroll-{auto,smooth}`                               | `scroll-behavior`.                  |
| `scrollbar-{auto,thin,none}`                         | `scrollbar-width`.                  |
| `scrollbar-{thumb,track}-<color>`                    | Composed `scrollbar-color` channel. |
| `scrollbar-gutter-{auto,stable,both}`                | `scrollbar-gutter`.                 |
| `snap-{none,x,y,both}`, `snap-{mandatory,proximity}` | Scroll-snap type and strictness.    |
| `snap-{normal,always}`                               | `scroll-snap-stop`.                 |
| `snap-{start,end,center,align-none}`                 | `scroll-snap-align`.                |

#### Example

```tsx
const styles = cssx.create({
  gallery: 'overflow-x-auto scroll-smooth snap-x snap-mandatory snap-always scrollbar-thin scrollbar-thumb-slate-500',
});

<div {...cssx.props(styles.gallery)} />;
```
