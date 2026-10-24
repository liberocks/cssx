---
title: 'Tables'
description: 'Table layout, border spacing, and caption placement.'
section: 'Utilities'
order: 5
keywords:
  - 'table'
  - 'border spacing'
  - 'caption'
---

| Class                                                      | Styles                                            |
| ---------------------------------------------------------- | ------------------------------------------------- |
| `border-{collapse,separate}`                               | `border-collapse`.                                |
| `border-spacing-<spacing>`                                 | `border-spacing`.                                 |
| `border-spacing-x-<spacing>`, `border-spacing-y-<spacing>` | Composed horizontal or vertical `border-spacing`. |
| `table-{auto,fixed}`                                       | `table-layout`.                                   |
| `caption-{top,bottom}`                                     | `caption-side`.                                   |

#### Example

```tsx
const styles = cssx.create({
  report: 'border-separate border-spacing-x-4 border-spacing-y-2 table-fixed',
});

<table {...cssx.props(styles.report)} />;
```
