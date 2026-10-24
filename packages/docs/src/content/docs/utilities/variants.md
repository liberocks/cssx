---
title: 'Variants'
description: 'Responsive, state, relationship, attribute, feature-query, and selector variants.'
section: 'Advanced'
order: 20
keywords:
  - 'variants'
  - 'responsive'
  - 'hover'
  - 'focus'
  - 'group'
  - 'peer'
  - 'dark'
  - 'supports'
---

Variants stack before a candidate, for example `tablet:hover:bg-brand`. CSSX
supports custom breakpoints from `--breakpoint-*`; defaults are `sm`, `md`,
`lg`, `xl`, and `2xl`.

| Variant                                                                                                                                                                                                                                                                                            | Selector or condition                                                         |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `hover:`                                                                                                                                                                                                                                                                                           | `:hover` within `@media (hover: hover)`.                                      |
| `focus:`, `focus-visible:`, `focus-within:`, `active:`, `disabled:`, `enabled:`, `visited:`, `checked:`, `indeterminate:`, `default:`, `valid:`, `invalid:`, `in-range:`, `out-of-range:`, `placeholder-shown:`, `autofill:`, `read-only:`, `required:`, `optional:`, `open:`, `target:`, `empty:` | Corresponding state pseudo-class.                                             |
| `first:`, `last:`, `only:`, `odd:`, `even:`, `first-of-type:`, `last-of-type:`, `only-of-type:`                                                                                                                                                                                                    | Structural pseudo-class.                                                      |
| `before:`, `after:`, `selection:`, `marker:`, `file:`, `first-letter:`, `first-line:`, `placeholder:`                                                                                                                                                                                              | Pseudo-element. `before` and `after` receive default empty content.           |
| `group-<state>:`, `peer-<state>:`                                                                                                                                                                                                                                                                  | Stateful group or sibling relationship.                                       |
| `state-[name]:`, `group-state-[name]:`, `peer-state-[name]:`                                                                                                                                                                                                                                       | Custom-element `:state(name)` condition, directly or through a group or peer. |
| `has-<state>:`, `has-[selector]:`, `in-<state>:`, `not-<state>:`                                                                                                                                                                                                                                   | Relationship condition.                                                       |
| `*:`, `**:`                                                                                                                                                                                                                                                                                        | Direct-child or descendant scope.                                             |
| `data-name:`, `data-[name=value]:`, `aria-name:`, `aria-[name=value]:`                                                                                                                                                                                                                             | Attribute condition.                                                          |
| `dark:`, `print:`, `supports-[property:value]:`, `not-supports-[property:value]:`                                                                                                                                                                                                                  | Media or support condition.                                                   |
| `<breakpoint>:`, `max-<breakpoint>:`, `min-[value]:`, `max-[value]:`                                                                                                                                                                                                                               | Responsive condition.                                                         |
| `[&>svg]:`, `[&.is-active]:`, `[@supports(...)]:`, `[@media ...]:`                                                                                                                                                                                                                                 | Safe arbitrary selector or at-rule condition.                                 |

Arbitrary selector variants must contain `&`; only static selectors and
supported at-rules are accepted.

Custom state names must be identifiers, for example `state-[open]:block` or
`group-state-[expanded]:text-white`.

#### Example

```tsx
const styles = cssx.create({
  trigger: 'sm:hover:bg-blue-600 group-focus:text-white data-[state=open]:block [&>svg]:size-4',
});

<button {...cssx.props(styles.trigger)} data-state="open">
  <svg />
</button>;
```
