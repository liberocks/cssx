---
title: 'Syntax and values'
description: 'How CSSX parses utility strings, values, modifiers, and declarations.'
section: 'Utility syntax'
order: 1
keywords:
  - 'utility syntax'
  - 'arbitrary values'
  - 'important'
  - 'negative'
  - 'custom properties'
---

CSSX checks every utility while building. A bracketed value must be static and safe. An unsupported utility stops the build. The examples below use `@cssxio/cssx`.

| Class                             | Styles                                                                                |
| --------------------------------- | ------------------------------------------------------------------------------------- |
| `-<utility>`                      | Negates supported spacing, dimensions, order, angles, hue rotation, and scale values. |
| `!<utility>` or `<utility>!`      | Marks every declaration emitted by the utility as `!important`.                       |
| `<family>-[value]`                | Provides a validated static arbitrary value for that family.                          |
| `<supported-family>-(--property)` | Uses `var(--property)` where that family accepts custom properties.                   |
| `[property:value]`                | Emits one validated static declaration.                                               |

#### Example

```tsx
const styles = cssx.create({
  card: 'sm:!-mt-2 bg-position-(--hero-position)',
});

<article {...cssx.props(styles.card)} />;
```
