---
title: 'Effects, filters, and masks'
description: 'Shadows, opacity, filters, backdrop filters, and masks.'
section: 'Utilities'
order: 13
keywords:
  - 'effects'
  - 'shadow'
  - 'opacity'
  - 'filter'
  - 'blur'
  - 'mask'
---

| Class                                                                                                                             | Styles                               |
| --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `shadow`, `shadow-{sm,md,lg,xl,none}`                                                                                             | Composable `box-shadow` channel.     |
| `opacity-<n>`                                                                                                                     | `opacity: n / 100`.                  |
| `filter-none`                                                                                                                     | Resets filter channels.              |
| `blur-{none,xs,sm,md,lg,xl,2xl,3xl,[value]}`                                                                                      | Composable `blur()`.                 |
| `brightness-*`, `contrast-*`, `saturate-*`, `grayscale[-0]`, `hue-rotate-{n,[value]}`, `invert[-0]`, `sepia[-0]`, `drop-shadow-*` | Composable `filter` channels.        |
| `backdrop-filter-none`                                                                                                            | Resets backdrop-filter channels.     |
| `backdrop-{blur,brightness,contrast,grayscale,hue-rotate,invert,opacity,saturate,sepia}-*`                                        | Composable backdrop-filter channels. |
| `mask-none`, `mask-[image]`, `mask-(--property)`                                                                                  | `mask-image`.                        |
| `mask-{cover,contain}`, `mask-{repeat,no-repeat,repeat-x,repeat-y,repeat-round,repeat-space}`                                     | Mask size or repeat.                 |
| `mask-clip-{border,padding,content}`, `mask-no-clip`, `mask-origin-{border,padding,content}`                                      | Mask clipping or origin.             |
| `mask-{position,size}-[value]`, `mask-{position,size}-(--property)`                                                               | Custom mask position or size.        |

#### Example

```tsx
const styles = cssx.create({
  portrait: 'shadow-md opacity-90 blur-sm backdrop-blur-md mask-[url("/mask.svg")] mask-cover',
});

<img {...cssx.props(styles.portrait)} alt="" />;
```
