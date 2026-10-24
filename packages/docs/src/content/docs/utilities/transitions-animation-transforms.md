---
title: 'Transitions, animation, and transforms'
description: 'Transition, keyframe animation, timeline, view-transition, and transform utilities.'
section: 'Utilities'
order: 14
keywords:
  - 'transition'
  - 'animation'
  - 'transform'
  - 'timeline'
  - 'view transition'
---

| Class                                                                                                                                                                                      | Styles                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| `transition`, `transition-{none,all,colors,opacity,shadow,transform,transform-opacity,filter,size,[value]}`                                                                                | Transition property and default timing.     |
| `transition-{normal,discrete}`                                                                                                                                                             | `transition-behavior`.                      |
| `duration-{n,theme,[value],(--property)}`, `delay-{n,theme,[value],(--property)}`                                                                                                          | Transition duration or delay.               |
| `ease-{linear,in,out,in-out,theme,[value],(--property)}`                                                                                                                                   | Transition timing function.                 |
| `motion-safe:*`, `motion-reduce:*`, `starting:*`                                                                                                                                           | Motion preference or entry-style variant.   |
| `animate-none`, `animate-{spin,ping,pulse,bounce,fade-in,fade-out,slide-in-*,scale-in,scale-out,shimmer}`, `animate-<theme-name>`, `animate-[value]`                                       | Animation. Only used keyframes are emitted. |
| `animation-name-{none,preset,theme,[value]}`, `animation-composition-{replace,add,accumulate}`                                                                                             | Animation name or composition.              |
| `animation-duration-{n,theme,[value],(--property)}`, `animation-delay-{n,theme,[value],(--property)}`                                                                                      | Independent animation duration or delay.    |
| `animation-ease-{linear,in,out,in-out,theme,[value],(--property)}`                                                                                                                         | Independent animation timing function.      |
| `animation-iterations-{1,2,3,infinite}`, `animation-direction-{normal,reverse,alternate,alternate-reverse}`, `animation-fill-{none,forwards,backwards,both}`, `animation-{running,paused}` | Independent animation playback controls.    |
| `stagger-*`, `stagger-index-*`, `stagger-count-*`, `stagger-reverse`, `{animation-,}delay-stagger`                                                                                         | Explicit CSS stagger channels.              |
| `animation-timeline-*`, `{scroll,view}-timeline-*`, `timeline-scope-*`, `animation-range-*`                                                                                                | Progress timelines and attachment ranges.   |
| `view-transition-{name,class}-*`, `vt-{old,new,group,image-pair}-[target]:*`                                                                                                               | Native snapshot capture and styling.        |
| `translate-{x,y}-<spacing>`                                                                                                                                                                | Composable individual `translate`.          |
| `rotate-{n,[value]}`                                                                                                                                                                       | Individual `rotate`.                        |
| `scale[-x/-y]-{n,[value]}`                                                                                                                                                                 | Composable individual `scale`.              |
| `skew-{x,y}-{n,[value]}`                                                                                                                                                                   | Composable `transform` skew channel.        |

#### Example

```tsx
const styles = cssx.create({
  button: 'transition-transform-opacity duration-normal ease-spring-snappy hover:scale-105',
  dialog: 'open:starting:opacity-0 open:starting:translate-y-2 motion-reduce:duration-instant',
});

<button {...cssx.props(styles.button)}>Save</button>;
```
