---
title: 'Colors'
description: 'Text, background, border, outline, SVG, and control colors.'
section: 'Utilities'
order: 10
keywords:
  - 'color'
  - 'palette'
  - 'opacity'
  - 'bg color'
  - 'text color'
---

| Class                                                      | Styles                                        |
| ---------------------------------------------------------- | --------------------------------------------- |
| `bg-<color>`, `text-<color>`, `border-<color>`             | Background, foreground, or border color.      |
| `outline-<color>`, `divide-<color>`, `placeholder-<color>` | Outline, child divider, or placeholder color. |
| `accent-<color>`, `caret-<color>`                          | Accent or caret color.                        |
| `fill-<color>`, `stroke-<color>`                           | SVG paint color.                              |
| `ring-<color>`, `ring-offset-<color>`                      | Ring or ring-offset color channel.            |
| `<color-utility>/<0..100>` or `<color-utility>/[number]`   | Applies color opacity with `color-mix()`.     |

The default palette has 50-950 shades for `red`, `orange`, `amber`, `yellow`,
`lime`, `green`, `emerald`, `teal`, `cyan`, `sky`, `blue`, `indigo`, `violet`,
`purple`, `fuchsia`, `pink`, `rose`, `slate`, `gray`, `zinc`, `neutral`,
`stone`, `mauve`, `olive`, `mist`, `taupe`, `steel`, `brown`, `vermilion`,
`mint`, `azure`, and `amethyst`, plus `black`, `white`, and `transparent`.
Every family name works in every color utility, such as `bg-vermilion-500`,
`text-steel-950`, and `border-mint-200`.

#### Example

```tsx
const styles = cssx.create({
  input: 'bg-blue-600 text-white border-blue-700/50 placeholder-slate-500',
});

<input {...cssx.props(styles.input)} placeholder="Project name" />;
```
