---
title: 'Interaction and form controls'
description: 'Cursor, pointer, selection, touch, appearance, and form-control utilities.'
section: 'Utilities'
order: 15
keywords:
  - 'interaction'
  - 'cursor'
  - 'pointer events'
  - 'touch'
  - 'select'
  - 'appearance'
  - 'form'
---

| Class                                                                                                                                                                                                                                                                                                                              | Styles                                    |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `cursor-{auto,default,pointer,wait,text,move,help,not-allowed,none,context-menu,progress,cell,crosshair,vertical-text,alias,copy,no-drop,grab,grabbing,all-scroll,col-resize,row-resize,n-resize,e-resize,s-resize,w-resize,ne-resize,nw-resize,se-resize,sw-resize,ew-resize,ns-resize,nesw-resize,nwse-resize,zoom-in,zoom-out}` | `cursor`.                                 |
| `touch-{auto,none,manipulation,pan-x,pan-y,pinch-zoom}`                                                                                                                                                                                                                                                                            | `touch-action`.                           |
| `will-change-{auto,scroll,contents,transform}`                                                                                                                                                                                                                                                                                     | `will-change`.                            |
| `pointer-events-{none,auto}`, `select-{none,text,all,auto}`                                                                                                                                                                                                                                                                        | Pointer event or text-selection behavior. |
| `accent-auto`, `accent-<color>`, `caret-auto`, `caret-<color>`                                                                                                                                                                                                                                                                     | Accent or caret color.                    |
| `appearance-{auto,none}`                                                                                                                                                                                                                                                                                                           | `appearance`.                             |
| `scheme-{normal,dark,light,light-dark,only-dark,only-light}`                                                                                                                                                                                                                                                                       | `color-scheme`.                           |
| `field-sizing-content`                                                                                                                                                                                                                                                                                                             | `field-sizing: content`.                  |
| `resize`, `resize-{x,y,none}`                                                                                                                                                                                                                                                                                                      | Resize behavior.                          |

#### Example

```tsx
const styles = cssx.create({
  textarea: 'cursor-text touch-manipulation select-none accent-blue-500 appearance-none resize-y',
});

<textarea {...cssx.props(styles.textarea)} />;
```
