---
title: 'Arbitrary declarations'
description: 'Validated property/value syntax for one-off static declarations.'
section: 'Utilities'
order: 18
keywords:
  - 'arbitrary properties'
  - 'declaration'
  - 'property value'
---

| Class              | Styles                                                           |
| ------------------ | ---------------------------------------------------------------- |
| `[property:value]` | One validated declaration. Custom properties are supported.      |
| `text-[length]`    | `font-size` when the value is recognized as a length.            |
| `text-[color]`     | Text color when the value resolves as a color.                   |
| `bg-[image]`       | `background-image` when the value is a supported image function. |
| `bg-[color]`       | Background color when the value resolves as a color.             |

Semicolons, braces, malformed nesting, and unsafe property names are rejected.
