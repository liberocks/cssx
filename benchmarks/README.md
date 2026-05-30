# CSSX benchmarks

These are deterministic local regression benchmarks, not a universal framework
ranking. They use a canonical component corpus with explicit physical padding,
colors, font size, and line height. Every runner validates that final CSS
contains every component width and the shared canonical declarations.

| Variant | Components | Declarations |
| ------- | ---------: | -----------: |
| Small   |        100 |        1,520 |
| Medium  |        500 |        7,600 |
| Large   |      1,000 |       15,200 |

Run the complete suite:

```sh
pnpm --dir benchmarks benchmark
```

Run one scale:

```sh
pnpm --dir benchmarks benchmark:medium
```

## Suites

### Final bundled output

This compares CSSX, Tailwind, and StyleX as final build artifacts. Each
implementation exports the same component-to-`className` data and keeps style
definitions internal. JavaScript is bundled and minified with the same esbuild
configuration; each implementation's final CSS is then measured separately.
CSSX uses its default serial names and automatic reusability planning. StyleX
rules are converted to final CSS with `processStylexRules`; intermediate
metadata is never counted. Tailwind receives the same component utility
occurrences as its generated consumer JavaScript and imports its utilities
layer without preflight or base CSS.

Reported output consists of separate JavaScript and CSS artifacts. Gzip size is
the sum of independently compressed artifacts, matching normal delivery rather
than compressing JavaScript and CSS together.
