---
title: 'Containment and rendering'
description: 'Content visibility, containment, intrinsic sizes, and image rendering.'
section: 'Utilities'
order: 19
keywords:
  - 'containment'
  - 'content visibility'
  - 'intrinsic size'
  - 'rendering'
---

| Class                                                                                  | Styles                                                                         |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `content-visibility-{visible,auto,hidden}`                                             | `content-visibility`.                                                          |
| `contain-{none,content,strict,size,inline-size,layout,style,paint}`, `contain-[value]` | CSS containment. Use underscores for spaces, such as `contain-[layout_paint]`. |
| `contain-intrinsic-{size,inline-size,block-size}-{n,[value],(--property)}`             | Intrinsic fallback size for contained content.                                 |
| `image-render-{auto,crisp-edges,pixelated}`                                            | Image interpolation behavior.                                                  |

#### Example

```tsx
const styles = cssx.create({
  logo: '[mask-type:luminance] text-[14px] bg-[url("/hero.svg")]',
});

<div {...cssx.props(styles.logo)} />;
```
